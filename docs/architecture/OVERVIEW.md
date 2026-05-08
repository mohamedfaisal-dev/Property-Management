# Architecture Overview

## System Architecture

This application follows a modern, scalable architecture pattern:

### Layers

1. **Presentation Layer** (React Components)
   - UI Components
   - Feature Components
   - Layout Components

2. **Application Layer** (Custom Hooks & State Management)
   - Custom React Hooks
   - Context Providers
   - State Management

3. **Business Logic Layer** (Services)
   - Domain Services
   - Business Rules
   - Validation Logic

4. **Data Access Layer** (Repositories)
   - Database Operations
   - Query Optimization
   - Data Transformation

5. **Infrastructure Layer**
   - Database Connection
   - External APIs
   - File Storage

### Design Patterns

- **Repository Pattern**: Abstraction over data access
- **Service Pattern**: Business logic encapsulation
- **Factory Pattern**: Object creation
- **Observer Pattern**: Event handling
- **Singleton Pattern**: Shared instances

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MariaDB with Sequelize ORM
- **Authentication**: JWT
- **File Storage**: Local filesystem
- **PDF Generation**: PDFKit
- **Email**: Nodemailer
- **Scheduling**: node-cron
