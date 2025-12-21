export declare const PBT_CONFIGURATION: {
    numRuns: number;
    timeout: number;
    verbose: boolean;
    seed: undefined;
    maxShrinkRounds: number;
    asyncProperty: boolean;
    categories: {
        validation: {
            numRuns: number;
            timeout: number;
            description: string;
        };
        security: {
            numRuns: number;
            timeout: number;
            description: string;
        };
        rateLimiting: {
            numRuns: number;
            timeout: number;
            description: string;
        };
        integration: {
            numRuns: number;
            timeout: number;
            description: string;
        };
    };
};
export declare const PROPERTY_TAGS: {
    PROPERTY_1: string;
    PROPERTY_2: string;
    PROPERTY_3: string;
    PROPERTY_4: string;
    PROPERTY_5: string;
    PROPERTY_6: string;
    PROPERTY_7: string;
    PROPERTY_8: string;
    PROPERTY_9: string;
    PROPERTY_10: string;
    PROPERTY_11: string;
    PROPERTY_12: string;
    PROPERTY_13: string;
};
export declare const GENERATORS: {
    validMobile: () => string;
    invalidMobile: () => string;
    validEmail: () => string;
    strongPassword: () => string;
    validPAN: () => string;
    validGST: (pan?: string) => string;
};
export default PBT_CONFIGURATION;
//# sourceMappingURL=pbt.config.d.ts.map