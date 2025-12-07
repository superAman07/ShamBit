package com.shambit.customer.presentation.test

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * Test screen to demonstrate API integration
 * This screen shows how to use the repositories and handle API responses
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TestApiScreen(
    viewModel: TestApiViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val products by viewModel.products.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val orders by viewModel.orders.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    var mobileNumber by remember { mutableStateOf("+919876543210") }
    var otp by remember { mutableStateOf("") }
    var searchQuery by remember { mutableStateOf("") }
    var promoCode by remember { mutableStateOf("WELCOME10") }
    var orderAmount by remember { mutableStateOf("1000") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("API Integration Test") }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Status Card
            item {
                StatusCard(
                    uiState = uiState,
                    isLoading = isLoading,
                    errorMessage = errorMessage
                )
            }

            // Authentication Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "1. Authentication",
                            style = MaterialTheme.typography.titleMedium
                        )

                        OutlinedTextField(
                            value = mobileNumber,
                            onValueChange = { mobileNumber = it },
                            label = { Text("Mobile Number") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { viewModel.testSendOtp(mobileNumber) },
                                modifier = Modifier.weight(1f),
                                enabled = !isLoading
                            ) {
                                Text("Send OTP")
                            }

                            Button(
                                onClick = { viewModel.testCheckLoginStatus() },
                                modifier = Modifier.weight(1f),
                                enabled = !isLoading
                            ) {
                                Text("Check Login")
                            }
                        }

                        OutlinedTextField(
                            value = otp,
                            onValueChange = { otp = it },
                            label = { Text("OTP") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { viewModel.testVerifyOtp(mobileNumber, otp) },
                                modifier = Modifier.weight(1f),
                                enabled = !isLoading
                            ) {
                                Text("Verify OTP")
                            }

                            OutlinedButton(
                                onClick = { viewModel.testLogout() },
                                modifier = Modifier.weight(1f),
                                enabled = !isLoading
                            ) {
                                Text("Logout")
                            }
                        }
                    }
                }
            }

            // Products Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "2. Products (${products.size})",
                            style = MaterialTheme.typography.titleMedium
                        )

                        Button(
                            onClick = { viewModel.testFetchProducts() },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !isLoading
                        ) {
                            Text("Fetch Products")
                        }

                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            label = { Text("Search Query") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = { viewModel.testSearchProducts(searchQuery) },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !isLoading && searchQuery.isNotEmpty()
                        ) {
                            Text("Search Products")
                        }
                    }
                }
            }

            // Display Products
            if (products.isNotEmpty()) {
                items(products.take(5)) { product ->
                    ProductItemCard(product)
                }
                if (products.size > 5) {
                    item {
                        Text(
                            text = "... and ${products.size - 5} more products",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                }
            }

            // Categories Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "3. Categories (${categories.size})",
                            style = MaterialTheme.typography.titleMedium
                        )

                        Button(
                            onClick = { viewModel.testFetchCategories() },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !isLoading
                        ) {
                            Text("Fetch Categories")
                        }
                    }
                }
            }

            // Display Categories
            if (categories.isNotEmpty()) {
                items(categories) { category ->
                    CategoryItemCard(category)
                }
            }

            // Orders Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "4. Orders (${orders.size})",
                            style = MaterialTheme.typography.titleMedium
                        )

                        Button(
                            onClick = { viewModel.testFetchOrders() },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !isLoading
                        ) {
                            Text("Fetch Orders")
                        }
                    }
                }
            }

            // Promo Code Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "5. Validate Promo Code",
                            style = MaterialTheme.typography.titleMedium
                        )

                        OutlinedTextField(
                            value = promoCode,
                            onValueChange = { promoCode = it },
                            label = { Text("Promo Code") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = orderAmount,
                            onValueChange = { orderAmount = it },
                            label = { Text("Order Amount") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = {
                                viewModel.testValidatePromo(
                                    promoCode,
                                    orderAmount.toDoubleOrNull() ?: 0.0
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !isLoading
                        ) {
                            Text("Validate Promo")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StatusCard(
    uiState: TestUiState,
    isLoading: Boolean,
    errorMessage: String?
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when {
                isLoading -> MaterialTheme.colorScheme.surfaceVariant
                errorMessage != null -> MaterialTheme.colorScheme.errorContainer
                uiState is TestUiState.Error -> MaterialTheme.colorScheme.errorContainer
                else -> MaterialTheme.colorScheme.primaryContainer
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Status",
                style = MaterialTheme.typography.titleMedium
            )

            if (isLoading) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp))
                    Text("Loading...")
                }
            }

            when (uiState) {
                is TestUiState.Idle -> Text("Ready to test API")
                is TestUiState.OtpSent -> Text("✅ ${uiState.message}")
                is TestUiState.LoginSuccess -> Text("✅ Login successful! User: ${uiState.authResponse.user.mobileNumber}")
                is TestUiState.ProductsLoaded -> Text("✅ Loaded ${uiState.count} products")
                is TestUiState.SearchResults -> Text("✅ Found ${uiState.count} products")
                is TestUiState.CategoriesLoaded -> Text("✅ Loaded ${uiState.count} categories")
                is TestUiState.ProductDetails -> Text("✅ Product: ${uiState.product.name}")
                is TestUiState.OrdersLoaded -> Text("✅ Loaded ${uiState.count} orders")
                is TestUiState.PromoValid -> Text("✅ ${uiState.message}")
                is TestUiState.PromoInvalid -> Text("❌ ${uiState.message}")
                is TestUiState.LoginStatus -> Text(if (uiState.isLoggedIn) "✅ Logged in" else "❌ Not logged in")
                is TestUiState.LoggedOut -> Text("✅ Logged out successfully")
                is TestUiState.Error -> Text("❌ Error: ${uiState.message}")
            }

            errorMessage?.let {
                Text(
                    text = "❌ $it",
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
fun ProductItemCard(product: com.shambit.customer.data.remote.dto.response.ProductDto) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Text(
                text = product.name,
                style = MaterialTheme.typography.titleSmall
            )
            Text(
                text = "₹${product.sellingPrice}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary
            )
            if (product.mrp > product.sellingPrice) {
                Text(
                    text = "MRP: ₹${product.mrp}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        }
    }
}

@Composable
fun CategoryItemCard(category: com.shambit.customer.data.remote.dto.response.CategoryDto) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = category.name,
                style = MaterialTheme.typography.titleSmall
            )
            Text(
                text = "${category.productCount} products",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline
            )
        }
    }
}
