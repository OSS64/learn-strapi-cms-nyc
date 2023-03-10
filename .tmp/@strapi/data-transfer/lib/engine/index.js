"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TransferEngine_instances, _TransferEngine_metadata, _TransferEngine_panic, _TransferEngine_reportError, _TransferEngine_reportWarning, _TransferEngine_reportInfo, _TransferEngine_createStageTransformStream, _TransferEngine_updateTransferProgress, _TransferEngine_progressTracker, _TransferEngine_emitTransferUpdate, _TransferEngine_emitStageUpdate, _TransferEngine_assertStrapiVersionIntegrity, _TransferEngine_assertSchemasMatching, _TransferEngine_transferStage, _TransferEngine_resolveProviderResource;
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransferEngine = exports.DEFAULT_SCHEMA_STRATEGY = exports.DEFAULT_VERSION_STRATEGY = exports.TransferGroupPresets = exports.TRANSFER_STAGES = void 0;
const stream_1 = require("stream");
const path_1 = require("path");
const os_1 = require("os");
const fp_1 = require("lodash/fp");
const semver_1 = require("semver");
const validation_1 = require("./validation");
const stream_2 = require("../utils/stream");
const errors_1 = require("./errors");
const diagnostic_1 = require("./diagnostic");
exports.TRANSFER_STAGES = Object.freeze([
    'entities',
    'links',
    'assets',
    'schemas',
    'configuration',
]);
/**
 * Preset filters for only/exclude options
 * */
exports.TransferGroupPresets = {
    content: {
        links: true,
        entities: true,
        // TODO: If we need to implement filtering on a running stage, it would be done like this, but we still need to implement it
        // [
        //   // Example: content processes the entities stage, but filters individual entities
        //   {
        //     filter(data) {
        //       return shouldIncludeThisData(data);
        //     },
        //   },
        // ],
    },
    files: {
        assets: true,
        links: true,
    },
    config: {
        configuration: true,
    },
};
exports.DEFAULT_VERSION_STRATEGY = 'ignore';
exports.DEFAULT_SCHEMA_STRATEGY = 'strict';
class TransferEngine {
    constructor(sourceProvider, destinationProvider, options) {
        _TransferEngine_instances.add(this);
        _TransferEngine_metadata.set(this, {});
        this.diagnostics = (0, diagnostic_1.createDiagnosticReporter)();
        (0, validation_1.validateProvider)('source', sourceProvider);
        (0, validation_1.validateProvider)('destination', destinationProvider);
        this.sourceProvider = sourceProvider;
        this.destinationProvider = destinationProvider;
        this.options = options;
        this.progress = { data: {}, stream: new stream_1.PassThrough({ objectMode: true }) };
    }
    shouldSkipStage(stage) {
        const { exclude, only } = this.options;
        // schemas must always be included
        if (stage === 'schemas') {
            return false;
        }
        // everything is included by default unless 'only' has been set
        let included = (0, fp_1.isEmpty)(only);
        if (only?.length > 0) {
            included = only.some((transferGroup) => {
                return exports.TransferGroupPresets[transferGroup][stage];
            });
        }
        if (exclude?.length > 0) {
            if (included) {
                included = !exclude.some((transferGroup) => {
                    return exports.TransferGroupPresets[transferGroup][stage];
                });
            }
        }
        return !included;
    }
    async init() {
        // Resolve providers' resource and store
        // them in the engine's internal state
        await __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_resolveProviderResource).call(this);
        // Update the destination provider's source metadata
        const { source: sourceMetadata } = __classPrivateFieldGet(this, _TransferEngine_metadata, "f");
        if (sourceMetadata) {
            this.destinationProvider.setMetadata?.('source', sourceMetadata);
        }
    }
    /**
     * Run the bootstrap method in both source and destination providers
     */
    async bootstrap() {
        const results = await Promise.allSettled([
            this.sourceProvider.bootstrap?.(),
            this.destinationProvider.bootstrap?.(),
        ]);
        results.forEach((result) => {
            if (result.status === 'rejected') {
                __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_panic).call(this, result.reason);
            }
        });
    }
    /**
     * Run the close method in both source and destination providers
     */
    async close() {
        const results = await Promise.allSettled([
            this.sourceProvider.close?.(),
            this.destinationProvider.close?.(),
        ]);
        results.forEach((result) => {
            if (result.status === 'rejected') {
                __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_panic).call(this, result.reason);
            }
        });
    }
    async integrityCheck() {
        try {
            const sourceMetadata = await this.sourceProvider.getMetadata();
            const destinationMetadata = await this.destinationProvider.getMetadata();
            if (sourceMetadata && destinationMetadata) {
                __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_assertStrapiVersionIntegrity).call(this, sourceMetadata?.strapi?.version, destinationMetadata?.strapi?.version);
            }
            const sourceSchemas = (await this.sourceProvider.getSchemas?.());
            const destinationSchemas = (await this.destinationProvider.getSchemas?.());
            if (sourceSchemas && destinationSchemas) {
                __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_assertSchemasMatching).call(this, sourceSchemas, destinationSchemas);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_panic).call(this, error);
            }
            throw error;
        }
    }
    async transfer() {
        // reset data between transfers
        this.progress.data = {};
        try {
            __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_emitTransferUpdate).call(this, 'init');
            await this.bootstrap();
            await this.init();
            await this.integrityCheck();
            __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_emitTransferUpdate).call(this, 'start');
            await this.beforeTransfer();
            // Run the transfer stages
            await this.transferSchemas();
            await this.transferEntities();
            await this.transferAssets();
            await this.transferLinks();
            await this.transferConfiguration();
            // Gracefully close the providers
            await this.close();
            __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_emitTransferUpdate).call(this, 'finish');
        }
        catch (e) {
            __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_emitTransferUpdate).call(this, 'error', { error: e });
            const lastDiagnostic = (0, fp_1.last)(this.diagnostics.stack.items);
            // Do not report an error diagnostic if the last one reported the same error
            if (e instanceof Error &&
                (!lastDiagnostic || lastDiagnostic.kind !== 'error' || lastDiagnostic.details.error !== e)) {
                __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_reportError).call(this, e, e.severity || 'fatal');
            }
            // Rollback the destination provider if an exception is thrown during the transfer
            // Note: This will be configurable in the future
            await this.destinationProvider.rollback?.(e);
            throw e;
        }
        return {
            source: this.sourceProvider.results,
            destination: this.destinationProvider.results,
            engine: this.progress.data,
        };
    }
    async beforeTransfer() {
        const runWithDiagnostic = async (provider) => {
            try {
                await provider.beforeTransfer?.();
            }
            catch (error) {
                // Error happening during the before transfer step should be considered fatal errors
                if (error instanceof Error) {
                    __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_panic).call(this, error);
                }
                else {
                    __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_panic).call(this, new Error(`Unknwon error when executing "beforeTransfer" on the ${origin} provider`));
                }
            }
        };
        await runWithDiagnostic(this.sourceProvider);
        await runWithDiagnostic(this.destinationProvider);
    }
    async transferSchemas() {
        const stage = 'schemas';
        const source = await this.sourceProvider.createSchemasReadStream?.();
        const destination = await this.destinationProvider.createSchemasWriteStream?.();
        const transform = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_createStageTransformStream).call(this, stage);
        const tracker = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_progressTracker).call(this, stage, { key: (value) => value.modelType });
        await __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_transferStage).call(this, { stage, source, destination, transform, tracker });
    }
    async transferEntities() {
        const stage = 'entities';
        const source = await this.sourceProvider.createEntitiesReadStream?.();
        const destination = await this.destinationProvider.createEntitiesWriteStream?.();
        const transform = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_createStageTransformStream).call(this, stage);
        const tracker = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_progressTracker).call(this, stage, { key: (value) => value.type });
        await __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_transferStage).call(this, { stage, source, destination, transform, tracker });
    }
    async transferLinks() {
        const stage = 'links';
        const source = await this.sourceProvider.createLinksReadStream?.();
        const destination = await this.destinationProvider.createLinksWriteStream?.();
        const transform = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_createStageTransformStream).call(this, stage);
        const tracker = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_progressTracker).call(this, stage);
        await __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_transferStage).call(this, { stage, source, destination, transform, tracker });
    }
    async transferAssets() {
        const stage = 'assets';
        const source = await this.sourceProvider.createAssetsReadStream?.();
        const destination = await this.destinationProvider.createAssetsWriteStream?.();
        const transform = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_createStageTransformStream).call(this, stage);
        const tracker = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_progressTracker).call(this, stage, {
            size: (value) => value.stats.size,
            key: (value) => (0, path_1.extname)(value.filename) ?? 'NA',
        });
        await __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_transferStage).call(this, { stage, source, destination, transform, tracker });
    }
    async transferConfiguration() {
        const stage = 'configuration';
        const source = await this.sourceProvider.createConfigurationReadStream?.();
        const destination = await this.destinationProvider.createConfigurationWriteStream?.();
        const transform = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_createStageTransformStream).call(this, stage);
        const tracker = __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_progressTracker).call(this, stage);
        await __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_transferStage).call(this, { stage, source, destination, transform, tracker });
    }
}
_TransferEngine_metadata = new WeakMap(), _TransferEngine_instances = new WeakSet(), _TransferEngine_panic = function _TransferEngine_panic(error) {
    __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_reportError).call(this, error, 'fatal');
    throw error;
}, _TransferEngine_reportError = function _TransferEngine_reportError(error, severity) {
    this.diagnostics.report({
        kind: 'error',
        details: {
            severity,
            createdAt: new Date(),
            name: error.name,
            message: error.message,
            error,
        },
    });
}, _TransferEngine_reportWarning = function _TransferEngine_reportWarning(message, origin) {
    this.diagnostics.report({
        kind: 'warning',
        details: { createdAt: new Date(), message, origin },
    });
}, _TransferEngine_reportInfo = function _TransferEngine_reportInfo(message, params) {
    this.diagnostics.report({
        kind: 'info',
        details: { createdAt: new Date(), message, params },
    });
}, _TransferEngine_createStageTransformStream = function _TransferEngine_createStageTransformStream(key, options = {}) {
    const { includeGlobal = true } = options;
    const { global: globalTransforms, [key]: stageTransforms } = this.options?.transforms ?? {};
    let stream = new stream_1.PassThrough({ objectMode: true });
    const applyTransforms = (transforms = []) => {
        for (const transform of transforms) {
            if ('filter' in transform) {
                stream = stream.pipe((0, stream_2.filter)(transform.filter));
            }
            if ('map' in transform) {
                stream = stream.pipe((0, stream_2.map)(transform.map));
            }
        }
    };
    if (includeGlobal) {
        applyTransforms(globalTransforms);
    }
    applyTransforms(stageTransforms);
    return stream;
}, _TransferEngine_updateTransferProgress = function _TransferEngine_updateTransferProgress(stage, data, aggregate) {
    if (!this.progress.data[stage]) {
        this.progress.data[stage] = { count: 0, bytes: 0 };
    }
    const stageProgress = this.progress.data[stage];
    if (!stageProgress) {
        return;
    }
    const size = aggregate?.size?.(data) ?? JSON.stringify(data).length;
    const key = aggregate?.key?.(data);
    stageProgress.count += 1;
    stageProgress.bytes += size;
    // Handle aggregate updates if necessary
    if (key) {
        if (!stageProgress.aggregates) {
            stageProgress.aggregates = {};
        }
        const { aggregates } = stageProgress;
        if (!aggregates[key]) {
            aggregates[key] = { count: 0, bytes: 0 };
        }
        aggregates[key].count += 1;
        aggregates[key].bytes += size;
    }
}, _TransferEngine_progressTracker = function _TransferEngine_progressTracker(stage, aggregate) {
    return new stream_1.PassThrough({
        objectMode: true,
        transform: (data, _encoding, callback) => {
            __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_updateTransferProgress).call(this, stage, data, aggregate);
            __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_emitStageUpdate).call(this, 'progress', stage);
            callback(null, data);
        },
    });
}, _TransferEngine_emitTransferUpdate = function _TransferEngine_emitTransferUpdate(type, payload) {
    this.progress.stream.emit(`transfer::${type}`, payload);
}, _TransferEngine_emitStageUpdate = function _TransferEngine_emitStageUpdate(type, transferStage) {
    this.progress.stream.emit(`stage::${type}`, {
        data: this.progress.data,
        stage: transferStage,
    });
}, _TransferEngine_assertStrapiVersionIntegrity = function _TransferEngine_assertStrapiVersionIntegrity(sourceVersion, destinationVersion) {
    const strategy = this.options.versionStrategy || exports.DEFAULT_VERSION_STRATEGY;
    const reject = () => {
        throw new errors_1.TransferEngineValidationError(`The source and destination provide are targeting incompatible Strapi versions (using the "${strategy}" strategy). The source (${this.sourceProvider.name}) version is ${sourceVersion} and the destination (${this.destinationProvider.name}) version is ${destinationVersion}`, {
            check: 'strapi.version',
            strategy,
            versions: { source: sourceVersion, destination: destinationVersion },
        });
    };
    if (!sourceVersion ||
        !destinationVersion ||
        strategy === 'ignore' ||
        destinationVersion === sourceVersion) {
        return;
    }
    let diff;
    try {
        diff = (0, semver_1.diff)(sourceVersion, destinationVersion);
    }
    catch {
        reject();
    }
    if (!diff) {
        return;
    }
    const validPatch = ['prelease', 'build'];
    const validMinor = [...validPatch, 'patch', 'prepatch'];
    const validMajor = [...validMinor, 'minor', 'preminor'];
    if (strategy === 'patch' && validPatch.includes(diff)) {
        return;
    }
    if (strategy === 'minor' && validMinor.includes(diff)) {
        return;
    }
    if (strategy === 'major' && validMajor.includes(diff)) {
        return;
    }
    reject();
}, _TransferEngine_assertSchemasMatching = function _TransferEngine_assertSchemasMatching(sourceSchemas, destinationSchemas) {
    const strategy = this.options.schemaStrategy || exports.DEFAULT_SCHEMA_STRATEGY;
    if (strategy === 'ignore') {
        return;
    }
    const keys = (0, fp_1.uniq)(Object.keys(sourceSchemas).concat(Object.keys(destinationSchemas)));
    const diffs = {};
    keys.forEach((key) => {
        const sourceSchema = sourceSchemas[key];
        const destinationSchema = destinationSchemas[key];
        const schemaDiffs = (0, validation_1.compareSchemas)(destinationSchema, sourceSchema, strategy);
        if (schemaDiffs.length) {
            diffs[key] = schemaDiffs;
        }
    });
    if (!(0, fp_1.isEmpty)(diffs)) {
        const formattedDiffs = Object.entries(diffs)
            .map(([uid, ctDiffs]) => {
            let msg = `- ${uid}:${os_1.EOL}`;
            msg += ctDiffs
                .sort((a, b) => (a.kind > b.kind ? -1 : 1))
                .map((diff) => {
                const path = diff.path.join('.');
                if (diff.kind === 'added') {
                    return `Added "${path}": "${diff.value}" (${diff.type})`;
                }
                if (diff.kind === 'deleted') {
                    return `Removed "${path}"`;
                }
                if (diff.kind === 'modified') {
                    return `Modified "${path}": "${diff.values[0]}" (${diff.types[0]}) => "${diff.values[1]}" (${diff.types[1]})`;
                }
                throw new errors_1.TransferEngineValidationError(`Invalid diff found for "${uid}"`, {
                    check: `schema on ${uid}`,
                });
            })
                .map((line) => `  - ${line}`)
                .join(os_1.EOL);
            return msg;
        })
            .join(os_1.EOL);
        throw new errors_1.TransferEngineValidationError(`Invalid schema changes detected during integrity checks (using the ${strategy} strategy). Please find a summary of the changes below:\n${formattedDiffs}`, {
            check: 'schema.changes',
            strategy,
            diffs,
        });
    }
}, _TransferEngine_transferStage = async function _TransferEngine_transferStage(options) {
    const { stage, source, destination, transform, tracker } = options;
    if (!source || !destination || this.shouldSkipStage(stage)) {
        // Wait until source and destination are closed
        const results = await Promise.allSettled([source, destination].map((stream) => {
            // if stream is undefined or already closed, resolve immediately
            if (!stream || stream.destroyed) {
                return Promise.resolve();
            }
            // Wait until the close event is produced and then destroy the stream and resolve
            return new Promise((resolve, reject) => {
                stream.on('close', resolve).on('error', reject).destroy();
            });
        }));
        results.forEach((state) => {
            if (state.status === 'rejected') {
                __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_reportWarning).call(this, state.reason, `transfer(${stage})`);
            }
        });
        __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_emitStageUpdate).call(this, 'skip', stage);
        return;
    }
    __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_emitStageUpdate).call(this, 'start', stage);
    await new Promise((resolve, reject) => {
        let stream = source;
        if (transform) {
            stream = stream.pipe(transform);
        }
        if (tracker) {
            stream = stream.pipe(tracker);
        }
        stream
            .pipe(destination)
            .on('error', (e) => {
            __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_reportError).call(this, e, 'error');
            destination.destroy(e);
            reject(e);
        })
            .on('close', resolve);
    });
    __classPrivateFieldGet(this, _TransferEngine_instances, "m", _TransferEngine_emitStageUpdate).call(this, 'finish', stage);
}, _TransferEngine_resolveProviderResource = async function _TransferEngine_resolveProviderResource() {
    const sourceMetadata = await this.sourceProvider.getMetadata();
    const destinationMetadata = await this.destinationProvider.getMetadata();
    if (sourceMetadata) {
        __classPrivateFieldGet(this, _TransferEngine_metadata, "f").source = sourceMetadata;
    }
    if (destinationMetadata) {
        __classPrivateFieldGet(this, _TransferEngine_metadata, "f").destination = destinationMetadata;
    }
};
const createTransferEngine = (sourceProvider, destinationProvider, options) => {
    return new TransferEngine(sourceProvider, destinationProvider, options);
};
exports.createTransferEngine = createTransferEngine;
//# sourceMappingURL=index.js.map