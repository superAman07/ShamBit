package com.shambit.customer.ui.components

import androidx.compose.ui.test.assertContentDescriptionEquals
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Accessibility tests for address-related UI components
 * 
 * These tests verify that all interactive elements have proper content descriptions,
 * semantic properties, and TalkBack navigation support as required by task 24.
 */
@RunWith(AndroidJUnit4::class)
class AddressAccessibilityTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val sampleAddress = Address(
        id = "1",
        name = "John Doe",
        phoneNumber = "9876543210",
        houseStreetArea = "123 Main Street, Downtown",
        city = "Mumbai",
        pincode = "400001",
        type = AddressType.HOME,
        isDefault = true,
        createdAt = "2024-01-01T00:00:00Z"
    )

    @Test
    fun addressCard_hasProperContentDescription() {
        var editClicked = false
        var deleteClicked = false
        var setDefaultClicked = false
        var cardClicked = false

        composeTestRule.setContent {
            AddressCard(
                address = sampleAddress,
                isSelected = true,
                showActions = true,
                onEdit = { editClicked = true },
                onDelete = { deleteClicked = true },
                onSetDefault = { setDefaultClicked = true },
                onClick = { cardClicked = true }
            )
        }

        // Verify main card has comprehensive content description
        composeTestRule
            .onNodeWithContentDescription(
                "Home address, Default address, Selected, John Doe, 123 Main Street, Downtown, Mumbai, 400001, Phone 9876543210"
            )
            .assertExists()
            .assertHasClickAction()

        // Verify edit button has proper description
        composeTestRule
            .onNodeWithContentDescription("Edit Home address for John Doe")
            .assertExists()
            .assertHasClickAction()
            .performClick()

        assert(editClicked)

        // Verify delete button has proper description
        composeTestRule
            .onNodeWithContentDescription("Delete Home address for John Doe")
            .assertExists()
            .assertHasClickAction()
            .performClick()

        assert(deleteClicked)
    }

    @Test
    fun addressCard_nonDefaultAddress_hasSetDefaultButton() {
        val nonDefaultAddress = sampleAddress.copy(isDefault = false)
        var setDefaultClicked = false

        composeTestRule.setContent {
            AddressCard(
                address = nonDefaultAddress,
                showActions = true,
                onSetDefault = { setDefaultClicked = true }
            )
        }

        // Verify set default button appears and has proper description
        composeTestRule
            .onNodeWithContentDescription("Set Home address for John Doe as default")
            .assertExists()
            .assertHasClickAction()
            .performClick()

        assert(setDefaultClicked)
    }

    @Test
    fun addressTypeSelector_hasProperSemantics() {
        var selectedType = AddressType.HOME

        composeTestRule.setContent {
            AddressTypeSelector(
                selectedType = selectedType,
                onTypeSelected = { selectedType = it }
            )
        }

        // Verify each address type has proper content description and role
        composeTestRule
            .onNodeWithContentDescription("Home address type")
            .assertExists()
            .assertHasClickAction()

        composeTestRule
            .onNodeWithContentDescription("Work address type")
            .assertExists()
            .assertHasClickAction()
            .performClick()

        assert(selectedType == AddressType.WORK)

        composeTestRule
            .onNodeWithContentDescription("Other address type")
            .assertExists()
            .assertHasClickAction()
    }

    @Test
    fun addressForm_fieldsHaveProperDescriptions() {
        composeTestRule.setContent {
            AddressForm(
                name = "John",
                phoneNumber = "987654321",
                houseStreetArea = "123 Main St",
                city = "Mumbai",
                pincode = "400001",
                type = AddressType.HOME,
                isDefault = true,
                validationErrors = mapOf("phoneNumber" to "Phone number must be 10 digits"),
                onNameChange = {},
                onPhoneChange = {},
                onHouseStreetAreaChange = {},
                onCityChange = {},
                onPincodeChange = {},
                onTypeChange = {},
                onIsDefaultChange = {}
            )
        }

        // Verify form fields have proper accessibility descriptions
        composeTestRule
            .onNodeWithContentDescription("Full name field, Current value: John")
            .assertExists()

        composeTestRule
            .onNodeWithContentDescription("Phone number field, 10 digits required, Error: Phone number must be 10 digits, Current value: 987654321")
            .assertExists()

        composeTestRule
            .onNodeWithContentDescription("House number, street, and area field, Current value: 123 Main St")
            .assertExists()

        composeTestRule
            .onNodeWithContentDescription("City field, Current value: Mumbai")
            .assertExists()

        composeTestRule
            .onNodeWithContentDescription("Pincode field, 6 digits required, Current value: 400001")
            .assertExists()

        composeTestRule
            .onNodeWithContentDescription("Set as default address, currently checked")
            .assertExists()
    }

    @Test
    fun emptyAddressState_hasProperAccessibility() {
        var addClicked = false

        composeTestRule.setContent {
            EmptyAddressState(
                title = "No Addresses Found",
                message = "Add your first address",
                actionText = "Add Address",
                onAction = { addClicked = true }
            )
        }

        // Verify add button has proper description
        composeTestRule
            .onNodeWithContentDescription("Add Address, navigate to address form")
            .assertExists()
            .assertHasClickAction()
            .performClick()

        assert(addClicked)
    }

    @Test
    fun deleteConfirmationDialog_hasProperAccessibility() {
        var confirmClicked = false
        var cancelClicked = false

        composeTestRule.setContent {
            DeleteConfirmationDialog(
                address = sampleAddress,
                isLastAddress = false,
                onConfirm = { confirmClicked = true },
                onDismiss = { cancelClicked = true }
            )
        }

        // Verify cancel button
        composeTestRule
            .onNodeWithContentDescription("Cancel address deletion")
            .assertExists()
            .assertHasClickAction()

        // Verify delete button with comprehensive description
        composeTestRule
            .onNodeWithContentDescription("Confirm delete Home address for John Doe, this is your default address")
            .assertExists()
            .assertHasClickAction()
    }

    @Test
    fun deleteConfirmationDialog_lastAddress_hasSpecialDescription() {
        composeTestRule.setContent {
            DeleteConfirmationDialog(
                address = sampleAddress.copy(isDefault = false),
                isLastAddress = true,
                onConfirm = {},
                onDismiss = {}
            )
        }

        // Verify delete button mentions it's the last address
        composeTestRule
            .onNodeWithContentDescription("Confirm delete Home address for John Doe, this is your last address")
            .assertExists()
    }
}