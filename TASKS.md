# GadgetZone Backend Tasks

To ensure this project is built to **Industry Standards**, every member must follow **Clean Architecture Design Patterns**. 
* **Backend Clean Architecture:** We will use a Layered Architecture. **Controllers** will handle HTTP Requests/Responses. **Services** will contain the actual business logic. **Repositories/Models** will handle direct MongoDB database queries.

---

### Member 3: Backend Developer 1 (Auth, User & Payment Services)
* **Goal:** Build the security, user management, and payment processing microservices using Node.js and MongoDB.
* **Responsibilities (10 Points):**
  1. **Project Setup (Backend):** Initialize the Node.js/Express server, set up MongoDB connection (Mongoose), and configure environment variables (dotenv).
  2. **User Database Model:** Design and implement the `User` Mongoose schema, including fields for roles (customer vs. admin) and password hashing (bcrypt).
  3. **Auth Controller (Registration):** Develop the API endpoint (`/api/auth/register`) for new users to sign up securely.
  4. **Auth Controller (Login):** Develop the API endpoint (`/api/auth/login`) that verifies passwords and generates a JWT (JSON Web Token) for session management.
  5. **Google Sign-in Integration:** Implement OAuth logic on the backend to allow users to authenticate using their Google accounts.
  6. **Security Middleware:** Create reusable middleware functions to protect routes (e.g., `verifyToken`, `isAdmin`) ensuring only authorized users can access specific endpoints.
  7. **User Profile CRUD:** Build endpoints allowing a logged-in user to fetch their own profile data and update their details.
  8. **Payment Service Setup:** Register for a PayHere Sandbox account and configure the backend to securely store PayHere merchant credentials.
  9. **Payment Hash Generation:** Develop the endpoint to generate the required MD5 hash signature that the frontend needs to initiate a PayHere payment securely.
  10. **Payment Webhook/Callback:** Create the critical endpoint that PayHere will call (webhook) to confirm a payment was successful, updating the order status in the database.

### Member 4: Backend Developer 2 (Product, Order & Analytics Services)
* **Goal:** Build the core e-commerce data microservices using Node.js and MongoDB.
* **Responsibilities (10 Points):**
  1. **Product Database Model:** Design and implement the `Product` Mongoose schema, including fields for name, description, price, category, stock count, and image URLs.
  2. **Product CRUD (Admin):** Develop the secure API endpoints for Admins to Create, Update, and Delete gadgets (`/api/admin/products`).
  3. **Product Fetching (Public):** Develop the public API endpoints for fetching all products, getting a single product by ID, and handling search queries.
  4. **Image Storage Logic:** Set up the backend logic (e.g., Multer or Cloudinary integration) to receive and store gadget images uploaded by the admin.
  5. **Order Database Model:** Design the `Order` Mongoose schema, linking it to the `User` who placed it and an array of `Products` purchased, along with shipping info and payment status.
  6. **Order Creation Logic:** Develop the endpoint (`/api/orders/create`) that validates cart items, calculates the final total price securely on the server, and saves the pending order.
  7. **Order Status Management:** Develop endpoints allowing the system (via payment webhook) or admins to update the shipping and payment status of an order.
  8. **Order History Fetching:** Create an endpoint allowing a logged-in customer to fetch their own past orders for their profile page.
  9. **Analytics Service (Sales):** Build an aggregation endpoint using MongoDB Aggregation Pipeline to calculate total revenue and group sales by month.
  10. **Analytics Service (Counts):** Build endpoints to count total active users, total products, and total pending orders to supply data to the Admin Dashboard widgets.
