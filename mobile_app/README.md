# ShamBit Customer Android App

> **Modern Android e-commerce app with complete API integration**

[![Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com)
[![Kotlin](https://img.shields.io/badge/Language-Kotlin-blue.svg)](https://kotlinlang.org)
[![API](https://img.shields.io/badge/Min%20SDK-24-orange.svg)](https://developer.android.com/about/versions/nougat)

---

## 📱 About

ShamBit is a modern Android e-commerce application similar to Blinkit and Flipkart, built with the latest Android technologies and best practices.

### **Current Status: API Integration Complete** ✅

The complete API integration layer is implemented and ready to use. You can now build the UI layer on top of this solid foundation.

---

## ✨ Features

### **Implemented** ✅
- ✅ Complete REST API integration (29 endpoints)
- ✅ JWT authentication with automatic token management
- ✅ Secure token storage with DataStore
- ✅ Network connectivity checking
- ✅ Error handling and logging
- ✅ Repository pattern with clean architecture
- ✅ Dependency injection with Hilt
- ✅ Kotlin Coroutines for async operations
- ✅ Type-safe networking with Retrofit
- ✅ Test screen for API verification

### **To Be Implemented** ⏳
- ⏳ Jetpack Compose UI screens
- ⏳ Navigation component
- ⏳ Cart management with Room DB
- ⏳ Payment integration (Razorpay)
- ⏳ Push notifications (Firebase)
- ⏳ Image loading with Coil
- ⏳ Order tracking
- ⏳ User profile management

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Compose UI + ViewModels)              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Domain Layer                    │
│  (Use Cases + Business Logic)           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Data Layer                      │
│  (Repositories + Data Sources)          │
└─────────────────────────────────────────┘
                  ↓
┌──────────────────┬──────────────────────┐
│   Remote API     │   Local Storage      │
│   (Retrofit)     │   (DataStore/Room)   │
└──────────────────┴──────────────────────┘
```

### **Tech Stack**

| Category | Technology |
|----------|-----------|
| **Language** | Kotlin |
| **UI** | Jetpack Compose |
| **Architecture** | MVVM + Clean Architecture |
| **DI** | Hilt |
| **Networking** | Retrofit + OkHttp |
| **Async** | Coroutines + Flow |
| **Storage** | DataStore + Room |
| **Image Loading** | Coil |
| **Navigation** | Compose Navigation |

---

## 🚀 Getting Started

### **Prerequisites**

- Android Studio (latest version)
- JDK 11 or higher
- Android SDK (API 24+)
- Backend API running (see `services/api/`)

### **Setup**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mobile_app
   ```

2. **Open in Android Studio**
   - File > Open > Select `mobile_app` folder
   - Wait for Gradle sync

3. **Start Backend API**
   ```bash
   cd services/api
   npm install
   npm run dev
   ```

4. **Run the App**
   - Click Run ▶️ in Android Studio
   - Or press `Shift + F10`

### **Configuration**

API URLs are configured in `app/build.gradle.kts`:

```kotlin
buildTypes {
    debug {
        // For Android Emulator
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000/api/v1/\"")
    }
    release {
        // For Production
        buildConfigField("String", "API_BASE_URL", "\"https://api.shambit.com/api/v1/\"")
    }
}
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[QUICK_START.md](QUICK_START.md)** | Get started in 5 minutes |
| **[API_INTEGRATION_README.md](API_INTEGRATION_README.md)** | Complete API documentation |
| **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** | What's been implemented |
| **[TESTING_GUIDE.md](TESTING_GUIDE.md)** | How to test the API integration |

---

## 🔌 API Endpoints

### **Authentication (6 endpoints)**
```
POST   /auth/register              Register new user
POST   /auth/send-otp              Send OTP for login
POST   /auth/verify-otp            Verify OTP and login
POST   /auth/refresh-token         Refresh access token
POST   /auth/logout                Logout user
GET    /auth/me                    Get current user
```

### **Products (7 endpoints)**
```
GET    /products                   Get products with filters
GET    /products/:id               Get product by ID
GET    /products/search            Search products
GET    /categories                 Get all categories
GET    /categories/:id             Get category by ID
GET    /brands                     Get all brands
GET    /brands/:id                 Get brand by ID
```

### **Orders (6 endpoints)**
```
POST   /orders                     Create new order
GET    /orders                     Get user orders
GET    /orders/:id                 Get order by ID
POST   /orders/:id/cancel          Cancel order
GET    /delivery/order/:orderId    Get delivery tracking
POST   /promotions/validate        Validate promo code
```

### **Profile (10 endpoints)**
```
GET    /profile                    Get user profile
PUT    /profile                    Update user profile
GET    /profile/addresses          Get user addresses
POST   /profile/addresses          Add new address
PUT    /profile/addresses/:id      Update address
DELETE /profile/addresses/:id      Delete address
PUT    /profile/addresses/:id/default  Set default address
POST   /notifications/device-token Register FCM token
GET    /notifications/history      Get notification history
DELETE /profile/account            Delete account
```

---

## 💻 Usage Examples

### **Authentication**

```kotlin
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    fun login(mobile: String, otp: String) {
        viewModelScope.launch {
            when (val result = authRepository.verifyOtp(mobile, otp)) {
                is NetworkResult.Success -> {
                    // Login successful, tokens saved automatically
                    navigateToHome()
                }
                is NetworkResult.Error -> {
                    showError(result.message)
                }
            }
        }
    }
}
```

### **Fetch Products**

```kotlin
@HiltViewModel
class ProductViewModel @Inject constructor(
    private val productRepository: ProductRepository
) : ViewModel() {
    
    private val _products = MutableStateFlow<List<ProductDto>>(emptyList())
    val products: StateFlow<List<ProductDto>> = _products.asStateFlow()
    
    fun loadProducts() {
        viewModelScope.launch {
            when (val result = productRepository.getProducts()) {
                is NetworkResult.Success -> {
                    _products.value = result.data.products
                }
                is NetworkResult.Error -> {
                    showError(result.message)
                }
            }
        }
    }
}
```

### **Create Order**

```kotlin
fun createOrder(items: List<OrderItem>, addressId: String) {
    viewModelScope.launch {
        val request = CreateOrderRequest(
            items = items,
            deliveryAddressId = addressId,
            paymentMethod = "upi"
        )
        
        when (val result = orderRepository.createOrder(request)) {
            is NetworkResult.Success -> {
                val order = result.data.order
                navigateToPayment(order)
            }
            is NetworkResult.Error -> {
                showError(result.message)
            }
        }
    }
}
```

---

## 🧪 Testing

### **Run Tests**

```bash
# Unit tests
./gradlew test

# Instrumented tests
./gradlew connectedAndroidTest
```

### **Manual Testing**

1. Run the app
2. Use the test screen to verify API endpoints
3. Check logs: `adb logcat | grep ShamBit`

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed testing instructions.

---

## 📁 Project Structure

```
app/src/main/java/com/shambit/customer/
├── data/
│   ├── local/
│   │   └── preferences/          # DataStore for tokens
│   ├── remote/
│   │   ├── api/                  # API interfaces
│   │   ├── dto/                  # Request/Response models
│   │   └── interceptor/          # Network interceptors
│   └── repository/               # Business logic
├── di/                           # Dependency injection
├── presentation/
│   └── test/                     # Test screens
├── util/                         # Utilities
├── MainActivity.kt               # Entry point
└── ShamBitApp.kt                # Application class
```

---

## 🔐 Security

- ✅ JWT token authentication
- ✅ Secure token storage with DataStore
- ✅ HTTPS for production
- ✅ Certificate pinning ready
- ✅ Input validation
- ✅ Error handling

---

## 🐛 Troubleshooting

### **Cannot connect to API**

**For Emulator:**
- Use `10.0.2.2` instead of `localhost`

**For Physical Device:**
- Use your computer's IP address
- Update `API_BASE_URL` in `build.gradle.kts`

### **401 Unauthorized**

- Check if logged in
- Try logging in again
- Check token expiry (15 minutes)

### **Gradle Sync Failed**

- File > Invalidate Caches > Restart
- Delete `.gradle` folder
- Sync again

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for more troubleshooting tips.

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| **API Endpoints** | 29 |
| **DTO Classes** | 25+ |
| **Repositories** | 3 |
| **Interceptors** | 2 |
| **Total Files** | 40+ |
| **Lines of Code** | 3000+ |

---

## 🗺️ Roadmap

### **Phase 1: API Integration** ✅ COMPLETE
- [x] Retrofit setup
- [x] API interfaces
- [x] DTOs
- [x] Repositories
- [x] Error handling
- [x] Token management

### **Phase 2: UI Layer** ⏳ IN PROGRESS
- [ ] Splash screen
- [ ] Login/OTP screens
- [ ] Home screen
- [ ] Product list
- [ ] Product details
- [ ] Cart screen
- [ ] Checkout flow

### **Phase 3: Features** ⏳ PLANNED
- [ ] Cart management (Room)
- [ ] Payment integration
- [ ] Push notifications
- [ ] Order tracking
- [ ] Profile management

### **Phase 4: Polish** ⏳ PLANNED
- [ ] Animations
- [ ] Dark mode
- [ ] Error states
- [ ] Testing
- [ ] Performance optimization

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

This project is proprietary software for ShamBit Platform.

---

## 📞 Support

For issues or questions:
- Check the documentation
- Review backend API docs
- Test with Postman
- Check logs: `adb logcat`

---

## 🎉 Acknowledgments

Built with:
- [Kotlin](https://kotlinlang.org/)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Retrofit](https://square.github.io/retrofit/)
- [Hilt](https://dagger.dev/hilt/)
- [Coroutines](https://kotlinlang.org/docs/coroutines-overview.html)

---

**Status:** ✅ API Integration Complete | ⏳ UI Development Ready

**Version:** 1.0.0

**Last Updated:** 2025-01-07

---

Made with ❤️ for ShamBit Platform
