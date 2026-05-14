# Privacy Policy

## Overview

fi-fore-importer is a data processing library designed to run locally. It does not collect, store, or transmit any personal or financial data to remote servers.

## Data Processing

### What Data We Process

- Financial transaction records (account numbers, amounts, dates, descriptions)
- CSV file contents provided by the host application
- Mapping rules and configuration provided by the host application

### How Data Is Processed

- All data processing occurs in-process within the host application
- No data is sent to external services by the importer library itself
- The importer provides adapter contracts that allow the host application to control data flow to external services

### Data Retention

- The importer does not retain any data between operations
- All data is managed by the host application and its persistent storage layer
- Host applications are responsible for implementing appropriate data retention policies

## Host Application Responsibility

Integrators of fi-fore-importer are responsible for:

- Ensuring compliance with applicable privacy regulations (GDPR, CCPA, etc.)
- Implementing secure storage of financial data
- Providing clear privacy notices to end users about data collection and use
- Obtaining appropriate consent from users before processing their financial data

## Adapter Contracts

fi-fore-importer allows host applications to inject adapters for:

- Persistence (storing import state and results)
- External transaction sources (e.g., bank APIs)
- Mapping engine implementations

Host applications are responsible for ensuring these injected implementations comply with privacy requirements.

## Questions

For privacy-related questions about fi-fore-importer itself, please open an issue on our GitHub repository.

For privacy questions about a specific fi-fore application, please contact that application's privacy policy holder.
