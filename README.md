# Inventory Manager API

Inventory Manager API is a Node.js-based application built with TypeScript, Express, and MongoDB. This application provides features for user authentication, inventory management, and payment processing.

## Features

- **User Authentication**: Register, login, verify email, resend-verify-email, password recovery, and cookie token-based authentication.
- **Inventory Management**: Full CRUD functionality for managing inventory items.
- **Payments**: Integration with payment gateways like Paystack.
- **Webhooks**: Reconcile inventory purchase upon successful payment.
- **API Documentation**: Easily view API details at `/docs`.

**Note**: All prices/amounts in this application are treated as kobo (or cents) to ensure precision during calculations and transactions.

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Caching**: Redis
- **TypeScript**: For strong typing and improved code quality
- **Docker**: For containerized deployment
- **Testing**: Jest

## Prerequisites

Before running the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v20 or higher)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/daviesesiro/inventory-manager-api.git
   cd inventory-manager-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and add the following environment variables:

    ```env
   PORT=3000
   MONGO_HOST_PORT=28017
   MONGO_CONTAINER_PORT=21212
   REDIS_HOST_PORT=6380  
   REDIS_CONTAINER_PORT=23323

   DB_URI=mongodb://mongo:${MONGO_CONTAINER_PORT}/inventory-app
   REDIS_URL=redis://redis:${REDIS_CONTAINER_PORT}

   PAYSTACK_API_KEY=your-paystack-secret
   NODE_ENV=development
   LOG_FORMAT=json
   SERVICE_ID=inventory-app
   JWT_SECRET=
   REFRESH_JWT_SECRET=
   WHITELISTED_HOSTS=localhost

   MAILGUN_API_KEY=mailgun-secret
   MAILGUN_DOMAIN=mg.mailgun.com
   MAIL_FROM="Inventory <no-reply@mailgun.com>"
   APP_URL=localhost:3001
    ```

4. Build the TypeScript project:

   ```bash
   npm run build
   ```

5. Run the application locally:

   ```bash
   npm start
   ```

## Using Docker

This project is containerized with Docker and uses Docker Compose to manage multiple services, including MongoDB and Redis.

1. Build and start the application using Docker Compose:

   ```bash
   docker-compose up --build
   ```

2. Access the API at `http://localhost:3000`.

3. Stop the application:

   ```bash
   docker-compose down
   ```

## API Endpoints

### Comprehensive docs (swagger)

- **GET** `/docs`: Get API docs (this route is protected by basic auth username and password is `inventory`)

### Authentication

- **POST** `/auth/register`: Register a new user.
- **POST** `/auth/verify-email`: Verify user's email.
- **POST** `/auth/resend-verify-email`: Resend verification email.
- **POST** `/auth/login`: Login and receive a JWT token.
- **POST** `/auth/forgot-password`: Request a password reset link.
- **POST** `/auth/reset-password`: Reset the user password.
- **POST** `/auth/logout`: Logout user (reset auth cookies)
- **GET** `/auth/session`: Get currently logged in user
- **GET** `/auth/change-password`: Change user password

### Inventory Management

- **GET** `/inventory`: Get a list of inventory items (requires authentication).
- **POST** `/inventory`: Create a new inventory item (requires authentication).
- **GET** `/inventory/:id`: Get details of a specific inventory item.
- **PUT** `/inventory/:id`: Update an inventory item.
- **DELETE** `/inventory/:id`: Delete an inventory item.
- **Get** `/inventory/payments`: Get payments for inventory [for current user].
- **POST** `/inventory/payments`: Initiate a payment using Paystack.

### Webhook

- **POST** `/pub/webhook/paystack`: Handle payment status updates (webhook).

## Testing

Run unit tests:

```bash
npm test
```

## Development Scripts

- `npm run dev`: Start the application in development mode with hot reload.
- `npm run build`: Build the TypeScript project.
- `npm start`: Start the production build.
- `npm test`: Run tests with Jest.

## Docker Services

- **API Service**: Runs the Node.js application.
- **MongoDB**: Database service.
- **Redis**: Caching service.

## Author

**Davies Esiro**  
[GitHub Profile](https://github.com/daviesesiro)

