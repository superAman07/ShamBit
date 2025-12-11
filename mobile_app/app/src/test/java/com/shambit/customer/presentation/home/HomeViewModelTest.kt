package com.shambit.customer.presentation.home

import com.shambit.customer.data.repository.BannerRepository
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.data.repository.PromotionRepository
import com.shambit.customer.data.repository.CartRepository
import com.shambit.customer.data.repository.AddressRepository
import com.shambit.customer.data.repository.WishlistRepository
import com.shambit.customer.data.local.preferences.CategoryPreferencesManager
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import com.shambit.customer.domain.usecase.GetAddressesUseCase
import com.shambit.customer.domain.usecase.SelectCheckoutAddressUseCase
import com.shambit.customer.util.NetworkResult
import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mock
import org.mockito.MockitoAnnotations
import org.mockito.kotlin.whenever

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    private lateinit var homeViewModel: HomeViewModel
    
    @Mock
    private lateinit var bannerRepository: BannerRepository
    @Mock
    private lateinit var productRepository: ProductRepository
    @Mock
    private lateinit var promotionRepository: PromotionRepository
    @Mock
    private lateinit var categoryPreferencesManager: CategoryPreferencesManager
    @Mock
    private lateinit var cartRepository: CartRepository
    @Mock
    private lateinit var addressRepository: AddressRepository
    @Mock
    private lateinit var wishlistRepository: WishlistRepository
    @Mock
    private lateinit var getAddressesUseCase: GetAddressesUseCase
    @Mock
    private lateinit var selectCheckoutAddressUseCase: SelectCheckoutAddressUseCase
    @Mock
    private lateinit var addressStateManager: com.shambit.customer.domain.manager.AddressStateManager
    @Mock
    private lateinit var context: Context

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        Dispatchers.setMain(testDispatcher)
        
        homeViewModel = HomeViewModel(
            bannerRepository = bannerRepository,
            productRepository = productRepository,
            promotionRepository = promotionRepository,
            categoryPreferencesManager = categoryPreferencesManager,
            cartRepository = cartRepository,
            addressRepository = addressRepository,
            wishlistRepository = wishlistRepository,
            getAddressesUseCase = getAddressesUseCase,
            selectCheckoutAddressUseCase = selectCheckoutAddressUseCase,
            addressStateManager = addressStateManager,
            context = context
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `loadDefaultAddress should update defaultAddress state when successful`() = runTest {
        // Given
        val testAddress = createTestAddress("1", "Home Address", isDefault = true)
        val addresses = listOf(testAddress)
        whenever(getAddressesUseCase()).thenReturn(NetworkResult.Success(addresses))

        // When
        homeViewModel.loadDefaultAddress()
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        assertEquals(testAddress, homeViewModel.defaultAddress.first())
        assertEquals(testAddress, homeViewModel.uiState.first().defaultAddress)
        assertEquals("Home - Test City", homeViewModel.uiState.first().deliveryAddress)
    }

    @Test
    fun `loadDefaultAddress should handle no default address`() = runTest {
        // Given
        val addresses = listOf(
            createTestAddress("1", "Work Address", isDefault = false),
            createTestAddress("2", "Other Address", isDefault = false)
        )
        whenever(getAddressesUseCase()).thenReturn(NetworkResult.Success(addresses))

        // When
        homeViewModel.loadDefaultAddress()
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        assertNull(homeViewModel.defaultAddress.first())
        assertNull(homeViewModel.uiState.first().defaultAddress)
        assertNull(homeViewModel.uiState.first().deliveryAddress)
    }

    @Test
    fun `loadDefaultAddress should handle error gracefully`() = runTest {
        // Given
        whenever(getAddressesUseCase()).thenReturn(NetworkResult.Error("Network error"))

        // When
        homeViewModel.loadDefaultAddress()
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        assertNull(homeViewModel.defaultAddress.first())
        assertNull(homeViewModel.uiState.first().defaultAddress)
        assertNull(homeViewModel.uiState.first().deliveryAddress)
    }

    @Test
    fun `openAddressSelection should set showAddressBottomSheet to true`() = runTest {
        // When
        homeViewModel.openAddressSelection()

        // Then
        assertTrue(homeViewModel.showAddressBottomSheet.first())
    }

    @Test
    fun `closeAddressSelection should set showAddressBottomSheet to false`() = runTest {
        // Given
        homeViewModel.openAddressSelection()
        assertTrue(homeViewModel.showAddressBottomSheet.first())

        // When
        homeViewModel.closeAddressSelection()

        // Then
        assertFalse(homeViewModel.showAddressBottomSheet.first())
    }

    @Test
    fun `selectAddress should update defaultAddress and close bottom sheet`() = runTest {
        // Given
        val testAddress = createTestAddress("1", "Selected Address", isDefault = true)
        whenever(selectCheckoutAddressUseCase(testAddress.id)).thenReturn(NetworkResult.Success(testAddress))
        
        // Open bottom sheet first
        homeViewModel.openAddressSelection()
        assertTrue(homeViewModel.showAddressBottomSheet.first())

        // When
        homeViewModel.selectAddress(testAddress)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        assertEquals(testAddress, homeViewModel.defaultAddress.first())
        assertFalse(homeViewModel.showAddressBottomSheet.first())
    }

    @Test
    fun `selectAddress should handle use case error gracefully`() = runTest {
        // Given
        val testAddress = createTestAddress("1", "Selected Address", isDefault = true)
        whenever(selectCheckoutAddressUseCase(testAddress.id)).thenReturn(NetworkResult.Error("Selection failed"))
        
        // Open bottom sheet first
        homeViewModel.openAddressSelection()

        // When
        homeViewModel.selectAddress(testAddress)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        // Should still update local state optimistically
        assertEquals(testAddress, homeViewModel.defaultAddress.first())
        assertFalse(homeViewModel.showAddressBottomSheet.first())
    }

    private fun createTestAddress(
        id: String,
        name: String,
        isDefault: Boolean = false,
        type: AddressType = AddressType.HOME
    ): Address {
        return Address(
            id = id,
            name = name,
            phoneNumber = "1234567890",
            houseStreetArea = "Test Street",
            city = "Test City",
            pincode = "123456",
            type = type,
            isDefault = isDefault,
            createdAt = "2023-01-01T00:00:00Z"
        )
    }
}