import * as fc from 'fast-check';
export declare const PBT_CONFIG: {
    numRuns: number;
    timeout: number;
    verbose: boolean;
    seed: number;
    endOnFailure: boolean;
};
export declare const generators: {
    indianMobile: () => fc.Arbitrary<string>;
    email: () => fc.Arbitrary<string>;
    fullName: () => fc.Arbitrary<string>;
    strongPassword: () => fc.Arbitrary<string>;
    otp: () => fc.Arbitrary<string>;
    registrationFormData: () => fc.Arbitrary<{
        fullName: string;
        mobile: string;
        email: string;
        password: string;
    }>;
};
//# sourceMappingURL=setup.d.ts.map