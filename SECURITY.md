# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in fi-fore-importer, please email security@fi-fore.dev with:

- Description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Any proposed fixes

Please do **not** open a public GitHub issue for security vulnerabilities.

We take all security reports seriously and will respond within 48 hours to acknowledge receipt.

## Security Considerations

### Data Handling

- The importer processes financial transaction data and CSV inputs
- All data transformations are performed in-process without external calls (except through injected adapters)
- Host applications are responsible for implementing secure storage and transmission of sensitive data

### Dependency Management

- We maintain a minimal dependency footprint to reduce attack surface
- Dependencies are regularly audited for known vulnerabilities
- Critical security updates are prioritized for immediate release

### Code Review

- Security-sensitive changes undergo additional review before merge
- Pull requests should undergo review from at least two maintainers for any auth/crypto/sensitive data changes

## Version Support

Currently, only the latest version of fi-fore-importer receives security updates. Users are encouraged to upgrade regularly.
