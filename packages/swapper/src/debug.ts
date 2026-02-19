export function timedPromise<T>(label: string, promise: Promise<T>): Promise<T> {
    const start = performance.now();
    return promise.then(
        (result) => {
            console.log(`${label}: ${(performance.now() - start).toFixed(0)}ms`);
            return result;
        },
        (err) => {
            console.log(`${label} FAILED: ${(performance.now() - start).toFixed(0)}ms`);
            throw err;
        },
    );
}
