import { ErrorDiagnosticSeverity } from '../engine/diagnostic';
export declare const SeverityKind: Record<string, ErrorDiagnosticSeverity>;
export declare type Severity = typeof SeverityKind[keyof typeof SeverityKind];
