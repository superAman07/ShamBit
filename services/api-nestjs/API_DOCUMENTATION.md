# MARKETPLACE API DOCUMENTATION

## 4. LOGICAL DATABASE SCHEMA

### Core Entities & Relationships

```
Users (1) ←→ (0..1) SellerProfiles
Users (1) ←→ (*) Addresses
Users (1) ←→ (*) Orders

Categories (1) ←→ (*) Ca