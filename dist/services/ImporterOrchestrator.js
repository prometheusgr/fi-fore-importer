"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImporterOrchestrator = void 0;
class ImporterOrchestrator {
    adapters;
    constructor(adapters) {
        this.adapters = adapters;
    }
    detectMapping(account, csvContent) {
        return {
            account,
            detection: this.adapters.mappingEngine.detectMapping(csvContent),
        };
    }
    async previewMappedImport(input) {
        const standardizedCsv = this.adapters.mappingEngine.applyMapping(input.csvContent, input.mapping, input.account.name);
        const preview = await this.adapters.transactionImporter.previewImport(standardizedCsv);
        return { standardizedCsv, preview };
    }
    async commitMappedImport(input) {
        const standardizedCsv = this.adapters.mappingEngine.applyMapping(input.csvContent, input.mapping, input.account.name);
        const result = await this.adapters.transactionImporter.importTransactions(standardizedCsv);
        return { standardizedCsv, result };
    }
    async pullFromHostSource(context) {
        if (!this.adapters.transactionSourceAdapter) {
            return null;
        }
        return this.adapters.transactionSourceAdapter.pullTransactions(context);
    }
}
exports.ImporterOrchestrator = ImporterOrchestrator;
