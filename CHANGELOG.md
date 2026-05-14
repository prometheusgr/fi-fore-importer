# Changelog

All notable changes to fi-fore-importer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-13

### Added

- Initial standalone release of fi-fore-importer extracted from main fi-fore application
- `ImporterOrchestrator` service for composing CSV import workflows with configurable adapters
- `TransactionSourceAdapter` contract for injecting external transaction sources
- Host adapter interfaces for mapping engine and transaction importer integration
- CSV mapping and transaction normalization pipeline
- Import preview and commit flow with comprehensive error handling
- Transaction type contracts and normalized import result types
- TypeScript type definitions for all public APIs
- Complete documentation: README, CONTRIBUTING, SECURITY, and PRIVACY policies
- GitHub Actions CI workflow for TypeScript type checking, unit tests, and build verification
- Jest test framework configuration with TypeScript support
- Package hardening with proper metadata, license, and security guidelines

### Design

- Provider-agnostic architecture allowing host applications to inject transaction sources
- Clear separation of concerns with explicit adapter boundaries
- Tellar and paid connector logic remain in the main fi-fore application
- Minimal external dependencies to reduce attack surface and maintenance overhead

### Notes

This is the first public release of fi-fore-importer as a standalone package. The API is
stabilizing but should be considered beta. Feedback and contributions are welcome.

For integration with the main fi-fore application, see the host adapter implementation
pattern in CONTRIBUTING.md and the MOVE_PLAN.md documentation.

---

## [Unreleased]

(New features and changes will be documented here before release)
