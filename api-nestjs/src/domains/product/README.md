# Product Domain

The Product domain is the core of the marketplace platform, managing the complete product lifecycle from creation to publishing. This domain implements enterprise-grade patterns with comprehensive validation, audit logging, and event-driven architecture.

## Architecture Overview

The Product domain follows Domain-Driven Design (DDD) principles with clean separation of concerns:

```
product/
├── entities/                 # Domain entities
├── enums/                   # Domain enums and constants
├── dtos/                    # Data transfer objects
├── interfaces/              # Repository and service interfaces
├── repositories/            # Data access layer
├── services/                # Business logic services
├── guards/                  # Authorization guards
├── events/                  # Domain events
├── validat