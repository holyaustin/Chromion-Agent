const { SecretsManager, SubscriptionManager } = require("@chainlink/functions-toolkit");

/**
 * DEV TODOS
 * 1. make sure your metamask is connected to Avalanche Fuji
 * 2. Have sufficient AVAX on Fuji
 * 3. update Constants below if you're using another network.
 */

const functionsRouterAddress = "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0"; // Fuji
const donId = "fun-avalanche-fuji-1"; // Fuji
const linkTokenAddress = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846" // Fuji
const LINK_AMOUNT = "0.000001"

const GATEWAY_URLS = ["https://01.functions-gateway.testnet.chain.link/", "https://02.functions-gateway.testnet.chain.link/"] // Fuji

let provider, signer

// initialize
async function init() {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    // Switch to Avalanche
    await provider.send("wallet_switchEthereumChain", [{ chainId: '0xA869' }]); // Fuji Chain ID in hex
    n = await signer.provider.getNetwork();
    console.log("NETWORK IS:  ", n)


    if (!provider || !signer) {
        throw Error("MISSING PROVIDER OR SIGNER")
    } else {
        console.info("Connection initialized")
    }
}


const encryptAndUploadSecrets = async () => {
    const secretsManager = new SecretsManager({
        signer: signer,
        functionsRouterAddress: functionsRouterAddress,
        donId: donId,
    });
    await secretsManager.initialize();

    const SLOT_ID = 0;
    const expirationTimeMinutes = 1440;

    // Encrypt secrets
    const secrets = { apikey: "TODO TODO  ANON KEY TODO TODO" };
    const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

    console.log(
        `Upload encrypted secret to gateways ${GATEWAY_URLS}. slotId ${SLOT_ID}. Expiration in minutes: ${expirationTimeMinutes}`
    );

    // Upload secrets
    const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
        encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
        gatewayUrls: GATEWAY_URLS,
        slotId: SLOT_ID,
        minutesUntilExpiration: expirationTimeMinutes,
    });

    if (!uploadResult.success) throw new Error(`Encrypted secrets not uploaded to ${GATEWAY_URLS}`);

    console.log(`\n✅ Secrets uploaded properly to gateways ${GATEWAY_URLS}! Gateways response: `, uploadResult);

    const donHostedSecretsVersion = parseInt(uploadResult.version); // fetch the reference of the encrypted secrets

    console.log(`donHostedSecretsVersion is ${donHostedSecretsVersion}`);
}



const createAndFundSub = async (consumerAddress = undefined) => {
    const subscriptionManager = new SubscriptionManager({
        signer,
        linkTokenAddress,
        functionsRouterAddress,
    });

    await subscriptionManager.initialize();

    // Create Subscription
    const subscriptionId = await subscriptionManager.createSubscription();
    console.log(`\nSubscription ${subscriptionId} created.`);

    // add consumer to subscription
    let addConsumerReceipt
    if (consumerAddress) {
        const addConsumerReceipt = await subscriptionManager.addConsumer({
            subscriptionId,
            consumerAddress,
        })
        console.log(
            `\nSubscription ${subscriptionId} now has ${consumerAddress} as a consumer. Tx Receipt: ${addConsumerReceipt})`
        );
    }


    // Fund Subscription
    const juelsAmount = ethers.utils.parseUnits(LINK_AMOUNT, 18).toString();
    console.log(`Funding Subscription ${subscriptionId} with ${juelsAmount} juels`)

    await subscriptionManager.fundSubscription({
        subscriptionId,
        juelsAmount,
    });

    console.log(
        `\nSubscription ${subscriptionId} funded with ${LINK_AMOUNT} LINK. Done.`
    );
};

async function main() {
    await init()
    await encryptAndUploadSecrets()
    //   await createAndFundSub()

}

main().catch((e) => { console.log("ERROR:   ", e) })