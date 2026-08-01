# 🔐 GadgetZone Gatekeeper Backend (Auth, User Management & PayHere Microservices)

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-brightgreen.svg)](https://nodejs.org/)
[![Express Framework](https://img.shields.io/badge/Express-v5.2-blue.svg)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/MongoDB-Atlas%20M0-green.svg)](https://www.mongodb.com/cloud/atlas)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20Modular%20Monolith-orange.svg)]()
[![Security](https://img.shields.io/badge/Security-JWT%20%7C%20Bcrypt%20%7C%20RateLimit%20%7C%20MD5-red.svg)]()

> **Role**: Member 3 — The Gatekeeper  
> **Mission**: Engineer an impenetrable security, user management, and payment processing backend microservice for the GadgetZone e-commerce platform.

---

## 📐 System Architecture & Diagrams

### 1. 🌐 System Architecture Diagram
The application follows a **Modular Monolith (In-Repo Microservices)** design pattern. Each domain module (`auth`, `user`, `payment`) operates within its bounded context, communicating internally via Clean Architecture service layers.

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Frontend / Mobile)"]
        ReactApp["React / Vite Web Application"]
        PayHereSDK["PayHere Checkout SDK"]
    end

    subgraph APIGateway ["Express API Gateway & Security Layer"]
        Cors["CORS Middleware"]
        BodyParser["JSON / UrlEncoded Parser"]
        RateLimiter["Login Rate Limiter (express-rate-limit)"]
        AuthGuard["verifyToken Guard (JWT)"]
        AdminGuard["isAdmin Guard"]
        ErrorHandler["Centralized Error Handler"]
    end

    subgraph Modules ["Clean Architecture Domain Microservices"]
        subgraph AuthModule ["Auth Service Context"]
            AuthController["AuthController"]
            AuthService["AuthService"]
            GoogleOAuth["Google OAuth Client (google-auth-library)"]
        end

        subgraph UserModule ["User Management Service Context"]
            UserController["UserController"]
            UserService["UserService"]
        end

        subgraph PaymentModule ["Payment Service Context"]
            PaymentController["PaymentController"]
            PaymentService["PaymentService (MD5 Crypto Engine)"]
        end
    end

    subgraph DataLayer ["Data Access & Storage Layer"]
        UserModel[("User Model")]
        OrderModel[("Order Model")]
        CounterModel[("Counter Model (Auto-Increment)")]
        MongoDB[("MongoDB Atlas Cloud Database")]
    end

    ReactApp -->|HTTP Requests| Cors
    Cors --> BodyParser
    BodyParser --> RateLimiter
    RateLimiter --> AuthGuard
    AuthGuard --> AdminGuard

    AuthGuard --> AuthController
    AuthGuard --> UserController
    AuthGuard --> PaymentController

    AuthController --> AuthService
    AuthService --> GoogleOAuth
    AuthService --> UserModel
    AuthService --> CounterModel

    UserController --> UserService
    UserService --> UserModel

    PaymentController --> PaymentService
    PaymentService --> OrderModel
    PayHereSDK -->|Webhook Callback| PaymentController

    UserModel --> MongoDB
    OrderModel --> MongoDB
    CounterModel --> MongoDB

    ErrorHandler -.->|Sanitized Errors| ClientLayer
```

---

### 2. 🧩 Class Diagram
Illustrates the structural relationship between Controllers, Services, Models, and DTOs adhering to Clean Layered Architecture:

```mermaid
classDiagram
    class User {
        +ObjectId _id
        +Number userId
        +String name
        +String email
        +String password
        +String role
        +Boolean isAdmin
        +String googleId
        +String avatar
        +String phoneNumber
        +String address_line1
        +String address_line2
        +Number city
        +Number province
        +Number gender
        +Boolean isEmailVerified
        +Boolean isActive
        +Boolean isRemoved
        +matchPassword(enteredPassword) Boolean
        +toAuthDTO(token) Object
    }

    class Counter {
        +String _id
        +Number seq
    }

    class Order {
        +ObjectId _id
        +ObjectId user
        +Array orderItems
        +Object shippingAddress
        +String paymentMethod
        +Object paymentResult
        +Number totalPrice
        +Boolean isPaid
        +Date paidAt
    }

    class AuthController {
        +register(req, res, next)
        +login(req, res, next)
        +googleAuth(req, res, next)
    }

    class AuthService {
        +generateToken(id) String
        +registerUser(userData) Object
        +loginUser(credentials) Object
        +googleAuth(idToken) Object
    }

    class UserController {
        +getProfile(req, res, next)
        +updateProfile(req, res, next)
        +deleteProfile(req, res, next)
        +getAllUsers(req, res, next)
        +getUserById(req, res, next)
        +updateUserStatus(req, res, next)
        +createAdmin(req, res, next)
        +updateUserRole(req, res, next)
        +deleteUserByAdmin(req, res, next)
        +restoreUserByAdmin(req, res, next)
    }

    class UserService {
        +findUserByIdentifier(identifier) User
        +getUserProfile(userId) User
        +updateUserProfile(userId, data) User
        +deleteUserProfile(userId) User
        +getAllUsers(params) Object
        +updateUserStatus(adminId, targetId, status) User
        +createAdminUser(data) User
        +updateUserRole(targetId, role) User
        +softDeleteUserByAdmin(adminId, targetId) User
        +restoreUserByAdmin(targetId) User
    }

    class PaymentController {
        +generateHash(req, res, next)
        +handleWebhook(req, res, next)
    }

    class PaymentService {
        +formatAmount(amount) String
        +getHashedSecret(secret) String
        +generatePayHereHash(params) Object
        +processPaymentNotification(data) Object
    }

    AuthController --> AuthService
    AuthService --> User
    AuthService --> Counter
    UserController --> UserService
    UserService --> User
    PaymentController --> PaymentService
    PaymentService --> Order
```

---

### 3. 🔄 Activity Diagram (Auth & Webhook Execution Flow)
Details the execution lifecycle for registration, login with security rate limiting, and PayHere webhook notification processing:

```mermaid
flowchart TD
    Start([User Initiates Action]) --> ActionType{Select Action}

    ActionType -->|Registration| RegInput[Submit Name, Email, Password]
    RegInput --> RegVal{Validate DTO?}
    RegVal -->|Invalid| Reg400[Return 400 Bad Request]
    RegVal -->|Valid| RegExist{Email Exists?}
    RegExist -->|Yes & Active| RegDup[Return 400 Duplicate Email]
    RegExist -->|No or Soft-Deleted| RegGenSeq[Generate Auto-Increment userId from Counter]
    RegGenSeq --> RegHash[Bcrypt Hash Password]
    RegHash --> RegSave[Save User with isEmailVerified=true & isActive=true]
    RegSave --> RegToken[Generate JWT Session Token]
    RegToken --> Reg201[Return 201 Created DTO]

    ActionType -->|Login| LogInput[Submit Email & Password]
    LogInput --> RateCheck{Rate Limit Exceeded?}
    RateCheck -->|Yes| Rate429[Return 429 Too Many Requests]
    RateCheck -->|No| LogVal{Validate DTO?}
    LogVal -->|Invalid| Log400[Return 400 Bad Request]
    LogVal -->|Valid| LogFind{Find User by Email?}
    LogFind -->|Not Found| Log401[Return 401 Invalid Credentials]
    LogFind -->|Found| CheckRemoved{isRemoved == true?}
    CheckRemoved -->|Yes| LogDeact[Return 401 Account Deleted]
    CheckRemoved -->|No| CheckActive{isActive == true?}
    CheckActive -->|No| LogSusp[Return 401 Account Suspended]
    CheckActive -->|Yes| MatchPass{Bcrypt Match Password?}
    MatchPass -->|Fail| Log401
    MatchPass -->|Success| LogGenToken[Generate JWT Session Token]
    LogGenToken --> Log200[Return 200 OK Auth DTO]

    ActionType -->|PayHere Webhook Callback| WebInput[PayHere Server POST /notify Payload]
    WebInput --> WebVal{Validate Required Payload?}
    WebVal -->|Invalid| Web400[Return 400 Invalid Callback]
    WebVal -->|Valid| WebCalc[Compute Local MD5 Checksum]
    WebCalc --> WebMatch{MD5 Signature Matches?}
    WebMatch -->|Mismatch| WebSigFail[Return 400 Signature Verification Failed]
    WebMatch -->|Match| WebStatus{status_code == 2?}
    WebStatus -->|Yes| WebOrder[Update Order in MongoDB: isPaid=true, paidAt=Now]
    WebStatus -->|No| WebLog[Log Non-Success Status Code]
    WebOrder --> Web200[Return 200 OK Webhook Processed]
    WebLog --> Web200
```

---

### 4. 🗄️ Entity-Relationship Diagram (ERD)
Defines the schema relationships and data fields across collections:

```mermaid
erDiagram
    COUNTER {
        string _id PK
        number seq
    }

    USER {
        objectId _id PK
        number userId UK "Auto-Increment starting 1"
        string name
        string email UK
        string password
        string role "customer | admin"
        boolean isAdmin
        string googleId
        string avatar
        string phoneNumber
        string address_line1
        string address_line2
        number city "Master Data City ID"
        number province "Master Data Province ID"
        number gender "Master Data Gender ID"
        boolean isEmailVerified "Default true"
        boolean isActive "Default true"
        boolean isRemoved "Default false"
        date createdAt
        date updatedAt
    }

    ORDER {
        objectId _id PK
        objectId user FK
        array orderItems
        object shippingAddress
        string paymentMethod
        object paymentResult
        number totalPrice
        boolean isPaid
        date paidAt
        boolean isDelivered
        date deliveredAt
    }

    USER ||--o{ ORDER : "places"
    COUNTER ||--|| USER : "generates userId for"
```

---

## 🛠️ Software Architecture & Design Patterns

| Pattern | Implementation in GadgetZone | Benefit |
| :--- | :--- | :--- |
| **Modular Monolith** | Bounded contexts organised inside `modules/auth`, `modules/user`, and `modules/payment`. | Microservices-ready structure without multi-repo operational overhead. |
| **Clean Layered Architecture** | strict separation of `Controller` $\rightarrow$ `Service` $\rightarrow$ `Model`. | Ensures high testability and decoupled domain business logic. |
| **Data Transfer Object (DTO)** | `dtos/authDtos.js`, `dtos/userDtos.js`, `dtos/paymentDtos.js`, `common/dtos/responseDto.js`. | Sanitizes input payloads and guarantees zero database stack traces or raw schemas leaked to clients. |
| **Soft Delete Pattern** | `isRemoved: Boolean` flag on User schema. | Preserves transactional and analytics integrity while deactivating user accounts. |
| **Auto-Increment Sequence** | `Counter` model generating sequential numeric `userId` starting at `1`. | Enables user-friendly numeric ID lookups (`GET /api/users/1`) alongside MongoDB ObjectIDs. |
| **Middleware Security Guard** | `verifyToken`, `isAdmin`, `loginLimiter`. | Declarative route protection, role verification, and brute-force mitigation. |

---

## 📊 Technical Stats & Security Specifications

* **Password Cryptography**: `bcryptjs` with salt factor **10** (HMAC-SHA256 equivalent security).
* **Session Tokens**: JWT signed with `HS256`, **30-day expiration window**.
* **Brute-Force Rate Limiting**: `express-rate-limit` restricting sensitive authentication routes to **5 attempts per 15-minute window** per IP.
* **Payment Hash Integrity**: PayHere MD5 cryptographic hash calculation:
  $$\text{Hash} = \text{MD5}(\text{MerchantID} + \text{OrderID} + \text{FormattedAmount} + \text{Currency} + \text{MD5}(\text{MerchantSecret}).\text{toUpperCase()}).\text{toUpperCase()}$$
* **Structured Auditing**: ALL CAPS structured logging output (`[AUTH SUCCESS]`, `[SECURITY WARN]`, `[PAYMENT INFO]`, `[ADMIN SUCCESS]`) for production observability.

---

## 📁 Code Structure Tree

```text
gadgetzone-backend/
├── common/
│   └── dtos/
│       └── responseDto.js         # Unified API & Error Response DTO formatters
├── config/
│   ├── db.js                      # MongoDB Atlas connection with dev DNS SRV fallback
│   └── payhere.js                 # PayHere merchant credentials configuration
├── middleware/
│   ├── authMiddleware.js          # verifyToken (JWT) & isAdmin security guards
│   ├── errorHandler.js            # Centralized error handler & stack trace protector
│   └── rateLimiter.js             # Brute-force protection middleware (loginLimiter)
├── models/
│   ├── Counter.js                 # Auto-increment sequence generator schema
│   ├── Order.js                   # E-commerce order schema & payment status
│   ├── Product.js                 # Product catalog schema
│   └── User.js                    # User schema (roles, isRemoved, isActive, master data IDs)
├── modules/
│   ├── auth/                      # Authentication Microservice Context
│   │   ├── dtos/authDtos.js
│   │   ├── authController.js
│   │   ├── authService.js
│   │   └── authRoutes.js
│   ├── user/                      # User Profile & Admin Management Microservice Context
│   │   ├── dtos/userDtos.js
│   │   ├── userController.js
│   │   ├── userService.js
│   │   └── userRoutes.js
│   └── payment/                   # PayHere Payment Processing Microservice Context
│       ├── dtos/paymentDtos.js
│       ├── paymentController.js
│       ├── paymentService.js
│       └── paymentRoutes.js
├── routes/
│   ├── productRoutes.js           # Public & Admin product endpoints
│   └── userRoutes.js              # Backward compatibility route aggregator
├── scripts/
│   └── seedAdmin.js               # CLI Super Admin seeder script
├── .env.example                   # Environment configuration template
├── index.js                       # Express main application genesis entry point
└── package.json
```

---

## 🚀 Quick Start Guide

### 1. Environment Setup
Copy [.env.example](file:///d:/Coding_Projects/GadgetZone/gadgetzone-backend/.env.example) to `.env` and configure your credentials:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://user:password@gadgetzone.sbkpvno.mongodb.net/gadgetzone?retryWrites=true&w=majority
JWT_SECRET=your_production_secret_key

# PayHere Credentials
PAYHERE_MERCHANT_ID=123456
PAYHERE_MERCHANT_SECRET=your_payhere_merchant_secret
PAYHERE_MODE=sandbox

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### 2. Seed Initial Admin Account
```powershell
npm run seed:admin
```
*(Creates initial Super Admin: `admin@gadgetzone.com` / `Admin123!`)*

### 3. Run Development Server
```powershell
npm run dev
```

---

## 📑 Complete API Endpoint Reference

| Module | Method | Endpoint | Access Guard | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Public | Register new user (assigns auto-increment `userId`) |
| **Auth** | `POST` | `/api/auth/login` | Public (Rate-Limited) | Login with email & password (max 5 requests/15 mins) |
| **Auth** | `POST` | `/api/auth/google` | Public | Google OAuth verification via `google-auth-library` |
| **User** | `GET` | `/api/users/profile` | `verifyToken` | Fetch logged-in user profile |
| **User** | `PUT` | `/api/users/profile` | `verifyToken` | Update user profile & master data fields |
| **User** | `DELETE` | `/api/users/profile` | `verifyToken` | Soft-delete own account (`isRemoved = true`) |
| **Admin** | `GET` | `/api/users?search=alex` | `verifyToken` + `isAdmin` | Search & filter user directory with pagination |
| **Admin** | `POST` | `/api/users/admin` | `verifyToken` + `isAdmin` | Onboard a new Admin user account |
| **Admin** | `GET` | `/api/users/:id` | `verifyToken` + `isAdmin` | Fetch single user profile by numeric `userId` or `_id` |
| **Admin** | `PUT` | `/api/users/:id/status` | `verifyToken` + `isAdmin` | Activate or deactivate user/admin account status (`isActive`) |
| **Admin** | `PUT` | `/api/users/:id/role` | `verifyToken` + `isAdmin` | Promote to Admin or demote to Customer (`role`) |
| **Admin** | `DELETE` | `/api/users/:id` | `verifyToken` + `isAdmin` | Soft-delete target user/admin account |
| **Admin** | `PUT` | `/api/users/:id/restore` | `verifyToken` + `isAdmin` | Restore/undelete soft-deleted user/admin account |
| **Payment** | `POST` | `/api/payments/hash` | `verifyToken` | Generate MD5 cryptographic signature for PayHere checkout |
| **Payment** | `POST` | `/api/payments/notify` | Public Webhook | PayHere payment confirmation callback webhook |
