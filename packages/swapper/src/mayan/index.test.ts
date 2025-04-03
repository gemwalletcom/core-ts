describe('Fetch Quote', () => {
    it('Convert hex BigInt string to decimal', () => {
        const hexValue = "0x2386f26fc10000";
        const expectedDecimalValue = BigInt(hexValue).toString();

        expect(expectedDecimalValue).toEqual("10000000000000000");
    });
});
