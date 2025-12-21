# Implementation Plan: Simplified Seller Registration

## Overview

This implementation plan focuses on building a friction-free seller registration system that addresses real-world pain points identified in the Indian marketplace. The approach prioritizes user experience while maintaining security and compliance requirements.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - Create TypeScript interfaces for all data models
  - Set up API route structure with versioning (/api/v1)
  - Configure database schema with simplified seller model
  - Set up testing framework (Jest + fast-check for property-based testing)
  - _Requirements: 1.1, 3.1, API versioning strategy_

- [x] 2. Implement core registration flow with friction reduction
  - [x] 2.1 Create minimal 4-field registration form
    - Build React component with mobile-first design
    - Implement real-time validation with user-friendly error messages
    - Add password strength indicator with helpful tips
    - Add clear examples beside fields and mobile-friendly error layouts
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [x] 2.2 Write property test for registration validation

    - **Property 1: Registration Data Validation**
    - **Validates: Requirements 1.3, 1.4, 1.5**

  - [x] 2.3 Implement OTP service with enhanced reliability and fallback
    - Build OTP generation and SMS sending service with retry logic
    - Add WhatsApp OTP fallback option for SMS delivery failures
    - Implement auto-fill detection and copy-paste support for mobile browsers
    - Add delivery status tracking and auto-resend on slow SMS providers
    - Add clear resend timer with countdown display
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 2.4 Write property tests for OTP lifecycle

    - **Property 3: OTP Generation and Verification**
    - **Property 4: OTP Lifecycle Management**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 3. Implement account creation and authentication
  - [x] 3.1 Build immediate account creation system
    - Create seller account without admin approval
    - Generate JWT tokens with proper lifecycle management (15-min access, 7-day refresh)
    - Implement token rotation strategy and reuse detection
    - Implement automatic login after successful registration
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 3.2 Write property test for account creation

    - **Property 2: Valid Registration Account Creation**
    - **Validates: Requirements 1.2, 3.1, 3.2, 3.5**

  - [x] 3.3 Implement secure login system with duplicate account handling
    - Build login form with email/mobile flexibility
    - Add "forgot password" with multiple recovery options (OTP + email)
    - Implement session management with refresh tokens and proper logout
    - Add duplicate account detection with recovery suggestions ("Account exists - Log in?")
    - _Requirements: 7.1, 7.2, 7.3, 13.1, 13.2_

- [x] 4. Build seller dashboard with progress tracking
  - [x] 4.1 Create seller portal dashboard
    - Build welcome screen with clear next steps
    - Implement profile completion progress indicator
    - Add contextual help and guidance tooltips
    - Display verification status with estimated timelines
    - _Requirements: 5.1, 5.2, 5.3, 29.1, 29.2_

  - [x] 4.2 Implement progressive profile completion
    - Create modular profile sections (Business, Address, Tax, Bank)
    - Allow partial saves and "complete later" options
    - Show feature unlock status based on completion
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 25.1, 25.2_

- [x] 5. Implement security and rate limiting
  - [x] 5.1 Add comprehensive rate limiting
    - Implement OTP request limiting with cooldown
    - Add registration and login rate limiting
    - Build IP-based abuse detection
    - _Requirements: 12.1, 12.2, 24.1, 24.2_

  - [ ]* 5.2 Write property tests for rate limiting
    - **Property 5: OTP Rate Limiting**
    - **Property 6: Registration Rate Limiting**
    - **Property 7: Login Rate Limiting**
    - **Validates: Requirements 12.1, 12.2, 24.1, 24.2**

  - [x] 5.3 Implement duplicate account prevention
    - Add email and mobile uniqueness checks
    - Build account recovery suggestions for duplicates
    - _Requirements: 14.1, 14.2_

  - [ ]* 5.4 Write property test for duplicate prevention
    - **Property 8: Duplicate Account Prevention**
    - **Validates: Requirements 14.1, 14.2**

- [ ] 6. Build KYC and document management system
  - [ ] 6.1 Create document upload interface
    - Build mobile-friendly file upload with camera integration
    - Add real-time image preview and quality checks
    - Implement drag-and-drop for desktop users
    - Show clear examples of acceptable documents
    - _Requirements: 15.1, 15.2, 28.1, 28.4_

  - [ ] 6.2 Implement PAN and GST validation with clear guidance
    - Add format validation with real-time feedback
    - Build GST-PAN cross-validation
    - Support non-GST sellers with clear messaging ("GST not needed if turnover below ₹40L")
    - Add "Start with PAN now, update GST later" option
    - Show real-time "names must match" tips for data consistency
    - _Requirements: 26.1, 26.2, 27.1, 27.2_

  - [ ]* 6.3 Write property tests for document validation
    - **Property 11: PAN Number Validation**
    - **Property 12: GST Number Validation**
    - **Validates: Requirements 26.1, 26.2**

- [ ] 7. Implement admin verification system
  - [ ] 7.1 Build admin dashboard for document review
    - Create admin interface with role-based access
    - Implement document verification workflow
    - Add bulk operations for efficiency
    - _Requirements: 18.1, 18.2, 18.4_

  - [ ] 7.2 Add audit trail and logging
    - Implement comprehensive audit logging
    - Build admin action tracking
    - Add document version history
    - _Requirements: 19.1, 19.2, 19.3_

- [ ] 8. Implement data security and encryption
  - [ ] 8.1 Add data encryption and security
    - Implement bcrypt password hashing
    - Add AES-256 encryption for sensitive data
    - Ensure HTTPS/TLS for all communications
    - _Requirements: 21.1, 21.3, 21.4_

  - [ ]* 8.2 Write property tests for security
    - **Property 9: Password Security**
    - **Property 10: Transport Security**
    - **Validates: Requirements 21.1, 21.4**

- [ ] 9. Build user experience enhancements
  - [ ] 9.1 Add mobile optimization features
    - Implement touch-friendly interface elements
    - Add auto-focus and appropriate input types
    - Optimize for 3G network performance
    - _Requirements: 32.1, 32.2, 32.3, 32.5_

  - [ ] 9.2 Implement contextual help system
    - Add inline help tooltips and guidance
    - Create clear error messages with solutions
    - Build FAQ integration for common issues
    - _Requirements: 10.3, 29.4_

- [ ] 10. Add fraud detection and abuse prevention
  - [ ] 10.1 Implement basic fraud detection
    - Build risk scoring system
    - Add device fingerprinting
    - Implement suspicious pattern detection
    - _Requirements: 12.3, 30.1, 30.2_

  - [ ]* 10.2 Write property test for abuse detection
    - **Property 13: Abuse Detection and Prevention**
    - **Validates: Requirements 12.3**

- [ ] 11. Implement backup and disaster recovery
  - [ ] 11.1 Set up data backup systems
    - Configure automated daily encrypted backups
    - Implement file replication and versioning
    - Build disaster recovery procedures
    - _Requirements: 31.1, 31.2, 31.3_

- [ ] 12. Add account management features
  - [ ] 12.1 Implement account deactivation and closure
    - Build self-service account deactivation
    - Add data export functionality
    - Implement soft delete with recovery period
    - _Requirements: 23.1, 23.2, 23.3, 23.4_

- [ ] 13. Final integration and testing
  - [ ] 13.1 Integrate all components and test end-to-end flows
    - Connect frontend and backend systems
    - Test complete registration to dashboard flow
    - Verify all security and validation features
    - _Requirements: All integrated requirements_

  - [ ]* 13.2 Run comprehensive property-based test suite
    - Execute all property tests with 100+ iterations each
    - Verify security properties and rate limiting
    - Test fraud detection and abuse prevention
    - **Feature: simplified-seller-registration, All Properties**

- [ ] 14. Checkpoint - Ensure all tests pass and system is production-ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Focus on friction reduction: OTP reliability, clear messaging, mobile optimization
- Implement progressive disclosure to reduce cognitive load
- Prioritize user experience while maintaining security and compliance