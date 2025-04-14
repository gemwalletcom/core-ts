import { ReferrerAddresses } from "@mayanfinance/swap-sdk";
import { ReferralInfo } from "@gemwallet/types";

export function getReferrerAddresses(info: ReferralInfo): ReferrerAddresses {
    return {
        evm: info.address.evm!,
        solana: info.address.solana!,
        sui: info.address.sui!,
    };
}
