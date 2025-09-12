# 🛒 E-commerce MVP API

<p align="center"> <a href="https://github.com/PrimeRaouf/ecommerce-store-api/actions"><img src="https://github.com/PrimeRaouf/ecommerce-store-api/actions/workflows/CI.yml/badge.svg" alt="CI"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white" alt="TypeScript"></a> <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white" alt="NestJS"></a> <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL"></a> <a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis"></a> <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker"></a> <a href="LICENSE"><img src="https://img.shields.io/badge/License-Private-red.svg" alt="License"></a> <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-22%2B-green?style=flat&logo=node.js" alt="Node.js Version"></a> <img src="https://img.shields.io/badge/Coverage-High-brightgreen.svg" alt="Coverage"> </p>

> A production-ready NestJS MVP API for an e-commerce store built with **Domain-Driven Design**, **Clean Architecture**, and modern best practices.

## 📋 Table of Contents

- [🌟 Key Features](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-key-features)
- [🚀 Quick Start](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-quick-start)
- [🧪 Testing](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-testing)
- [🗄️ Database Management](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#%EF%B8%8F-database-management)
- [🐳 Docker & Infrastructure](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-docker--infrastructure)
- [🏗️ Project Architecture](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#%EF%B8%8F-project-architecture)
- [🔧 Environment Configuration](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-environment-configuration)
- [📜 Available Scripts](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-available-scripts)
- [🚦 API Endpoints](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-api-endpoints)
- [🔐 Security & Best Practices](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-security--best-practices)
- [🛠️ Troubleshooting](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#%EF%B8%8F-troubleshooting)
- [📊 Project Statistics](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-project-statistics)
- [📄 License](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-license)
- [🤝 Acknowledgments](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-acknowledgments)
- [📞 Support](https://claude.ai/chat/83b07142-0719-4465-9f2c-a91adfa70831#-support)

---

## 🌟 Key Features

### 🏗️ **Architecture & Design**

- **Domain-Driven Design (DDD)** with clear layer separation
- **Clean Architecture** principles (presentation, application, domain, infrastructure)
- **Result Pattern** for consistent error handling
- **TypeScript** for type safety and better developer experience

### 🛠️ **Technology Stack**

- **NestJS** - Scalable Node.js framework
- **PostgreSQL** with **TypeORM** - Robust relational database with migrations
- **Redis** with **RedisJSON & RedisSearch** - Advanced caching and search capabilities
- **Docker Compose** - Containerized development environment
- **Swagger/OpenAPI** - Auto-generated API documentation

### 🧪 **Quality Assurance**

- **Comprehensive Unit Testing** with Jest
- **High Test Coverage** across all layers
- **GitHub Actions CI/CD** with automated testing
- **ESLint + Prettier** for code quality
- **Type-safe environment configuration**

### 📦 **Core Modules**

- **Product Management** - Complete CRUD with advanced filtering
- **Order Processing** - Order lifecycle management
- **Authentication** - JWT-based security
- **Validation** - Request/response validation with class-validator

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** ≥ 22 (tested with v22.14.0)
- **npm** ≥ 11 (tested with v11.4.2)
- **Docker Desktop** ≥ 28 (tested with v28.3.2)
- **Docker Compose v2** (`docker compose` command)
- **Git** ≥ 2.49

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/PrimeRaouf/ecommerce-store-api.git
    cd ecommerce-store-api

    ```

2.  **Install dependencies**

    ```bash
    npm install

    ```

3.  **Generate environment files**

    ```bash
    # Generate all environment files
    npm run env:init

    # Or generate specific environment
    npm run env:init:dev

    ```

4.  **Configure environment variables**

    Update the generated `.env.*` files with your secrets:

    - Database credentials
    - Redis configuration
    - JWT secrets
    - Other service configurations

5.  **Start infrastructure services**

    ```bash
    npm run d:up:dev

    ```

6.  **Run database migrations**

    ```bash
    npm run migration:run:dev

    ```

7.  **Start the development server**

    ```bash
    npm run start:dev

    ```

The API will be available at `http://localhost:3000` 🎉

📖 **API Documentation**: `http://localhost:3000/api` (Swagger UI)

---

## 🧪 Testing

Our testing strategy ensures high code quality and reliability:

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:cov

# Run E2E tests
npm run test:e2e

# CI mode (used in GitHub Actions)
npm run test:ci

```

### Test Coverage

- **Unit Tests**: Domain logic, services, and utilities
- **Integration Tests**: Database interactions and Redis caching
- **E2E Tests**: Complete API endpoint testing
- **Coverage Reporting**: Detailed coverage metrics with Jest

---

## 🗄️ Database Management

### Migrations with TypeORM

```bash
# Generate migration from entity changes
npm run migration:generate:dev -- CreateProductTable

# Create empty migration
npm run migration:create:dev -- AddProductIndex

# Run pending migrations
npm run migration:run:dev

# Revert last migration
npm run migration:revert:dev

# Show migration status
npm run migration:show:dev

```

### Multi-Environment Support

Replace `:dev` with `:prod`, `:staging`, or `:test` for different environments.

---

## 🐳 Docker & Infrastructure

### Docker Compose Commands

```bash
# Development environment
npm run d:up:dev      # Start services
npm run d:down:dev    # Stop services
npm run d:reset:dev   # Reset with fresh data

# Production environment
npm run d:up:prod
npm run d:down:prod
npm run d:reset:prod

# Other environments: staging, test
npm run d:up:staging
npm run d:up:test

```

### Services Included

- **PostgreSQL 16.3** - Primary database
- **Redis Stack 7.2** - Caching and search (includes RedisJSON & RedisSearch)
- **Custom networking** for service communication

---

## 🏗️ Project Architecture

### Clean Architecture Layers

```
src/
├── modules/                 # Feature modules
│   ├── product/            # Product domain module
│   │   ├── application/    # Use cases & DTOs
│   │   ├── domain/         # Entities & domain logic
│   │   ├── infrastructure/ # Repositories & external services
│   │   └── presentation/   # Controllers & validation
│   └── order/              # Order domain module
├── shared/                 # Shared utilities & types
├── config/                 # Configuration modules
└── main.ts                 # Application bootstrap

```

### Design Principles

- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Single Responsibility**: Each class has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Interface Segregation**: Many client-specific interfaces

---

## 🔧 Environment Configuration

### Environment Files

- `.env.development` - Development settings
- `.env.staging` - Staging environment
- `.env.production` - Production configuration
- `.env.test` - Testing environment
- `.env.example` - Template with all required keys

### Key Configuration Areas

- **Database Connection** (PostgreSQL)
- **Redis Configuration** (connection, keyspace)
- **JWT Authentication** (secrets, expiration)
- **API Settings** (port, CORS, rate limiting)

---

## 📜 Available Scripts

### Development

- `start:dev` - Start in watch mode
- `start:debug` - Start with debugging
- `build` - Build for production
- `lint` - Run ESLint with auto-fix

### Testing

- `test` - Run unit tests
- `test:watch` - Run tests in watch mode
- `test:cov` - Generate coverage report
- `test:e2e` - Run end-to-end tests
- `test:ci` - Run tests in CI mode

### Database

- `migration:generate:*` - Generate new migration
- `migration:run:*` - Apply migrations
- `migration:revert:*` - Rollback migration

### Docker

- `d:up:*` - Start environment services
- `d:down:*` - Stop environment services
- `d:reset:*` - Reset environment with fresh data

### Utilities

- `env:init` - Generate all environment files
- `clean` - Remove build artifacts

---

## 🚦 API Endpoints

### Core Resources

Method

Endpoint

Description

`GET`

`/api/products`

List products with filtering

`POST`

`/api/products`

Create new product

`GET`

`/api/products/:id`

Get product details

`PUT`

`/api/products/:id`

Update product

`DELETE`

`/api/products/:id`

Delete product

`GET`

`/api/orders`

List user orders

`POST`

`/api/orders`

Create new order

`GET`

`/api/orders/:id`

Get order details

### Documentation

Full API documentation with request/response schemas available at: **`http://localhost:3000/api`** when running locally.

---

## 🔐 Security & Best Practices

### Security Features

- **JWT Authentication** with secure token handling
- **Input Validation** with class-validator decorators
- **SQL Injection Prevention** with TypeORM query builders
- **CORS Configuration** for cross-origin requests
- **Rate Limiting** (configurable per endpoint)

### Development Best Practices

- **TypeScript** for compile-time type checking
- **ESLint + Prettier** for consistent code style
- **Husky Git Hooks** for pre-commit validation
- **Environment-based Configuration** for different deployment stages
- **Comprehensive Error Handling** with custom exceptions

---

## 🛠️ Troubleshooting

### Common Issues

#### Docker Services Won't Start

```bash
# Check if ports are in use
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Reset Docker environment
npm run d:reset:dev

```

#### Migration Errors

```bash
# Ensure database is running
npm run d:up:dev

# Check connection with migration status
npm run migration:show:dev

# Reset database if needed (⚠️ DATA LOSS)
npm run d:reset:dev
npm run migration:run:dev

```

#### Test Failures

```bash
# Run tests in isolation
npm run test:ci

# Check for open handles
npm run test -- --detectOpenHandles

# Ensure test database is clean
npm run d:reset:test

```

### Environment Issues

- Verify all required environment variables are set
- Check `.env.example` for the complete list of required keys
- Ensure Docker services are healthy before running the application

---

## 📊 Project Statistics

- **Languages**: TypeScript 100%
- **Test Coverage**: High (run `npm run test:cov` for details)
- **Build Status**: Automated CI/CD with GitHub Actions
- **Dependencies**: Always up-to-date with security patches

---

## 📄 License

**All rights reserved © 2025 PrimeRaouf.**

This repository is private. Do not copy, distribute, or use this code without explicit permission.

---

## 🤝 Acknowledgments

- **NestJS Team** for the excellent framework
- **TypeORM** for robust database management
- **Redis** for high-performance caching
- **Jest** for comprehensive testing capabilities

---

## 📞 Support

For questions, issues, or contributions:

- **GitHub Issues**: [Report bugs or request features](https://github.com/PrimeRaouf/ecommerce-store-api/issues)
- **GitHub Repository**: [https://github.com/PrimeRaouf/ecommerce-store-api](https://github.com/PrimeRaouf/ecommerce-store-api)

---

**Built with ❤️ by [PrimeRaouf](https://github.com/PrimeRaouf)**

_Crafting production-ready APIs with clean architecture and modern best practices_
