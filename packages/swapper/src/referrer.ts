export type Referrers = {
    evm: string;
    solana: string;
    sui: string;
    ton: string;
    tron: string;
};

export function getReferrerFeeBps(): number {
    return 50;
}

export function getReferrerAddresses(): Referrers {
    return {
        evm: "0x0D9DAB1A248f63B0a48965bA8435e4de7497a3dC",
        solana: "5fmLrs2GuhfDP1B51ziV5Kd1xtAr9rw1jf3aQ4ihZ2gy",
        sui: "0x9d6b98b18fd26b5efeec68d020dcf1be7a94c2c315353779bc6b3aed44188ddf",
        ton: "UQDxJKarPSp0bCta9DFgp81Mpt5hpGbuVcSxwfeza0Bin201",
        tron: "TYeyZXywpA921LEtw2PF3obK4B8Jjgpp32"
    };
}

export const CETUS_PARTNER_ID = "0x08b1875b6541c847f05ed71d04cbcfa66e4e8619bf3b8923b07c5b5409433366";
