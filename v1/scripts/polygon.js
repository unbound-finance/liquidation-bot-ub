

require("dotenv").config();
const Web3 = require("web3");
const Provider = require("@truffle/hdwallet-provider");
const polygonNodeUrl = process.env.mumbaiNodeURl;

//Smart COntract ABIS for accountmanager contract for fetching the lowest cr ratio accounts
const ACCOUNT_MANAGER = require("../contractAbis/accountManager.json");

//Deployed Smart COntract Addresses(eth dai)    (usdtusdc=0x46D82f2925F805fF4a4c424D37F606e84972B464)   dai-usd=0x372C7CA267E36d98dED7283855Aac92E5C44b51a
const multiAccountGetter = "0x372C7CA267E36d98dED7283855Aac92E5C44b51a";
const accountManager = "0xddebdef510e2bc6b9b8dedf1235b71fd747b1177";
const bowrowerContractAddress = "0xd8f4dc190a6ffdae202d99408b966c17f7d580c6";

//Private Key for wallet 0x113Fca29bE47647c26B4E9b5dFA040c4b2dFD11b
const adminAddress = "0x113Fca29bE47647c26B4E9b5dFA040c4b2dFD11b";
const privateKey = process.env.privateKey;
const provider = new Provider(privateKey, polygonNodeUrl);
const web3 = new Web3(provider);

//convert collateral to percentage

const multiAccountGetterContractInitiate = new web3.eth.Contract(
  ACCOUNT_MANAGER,
  multiAccountGetter
);

const accountmanager = new web3.eth.Contract(ACCOUNT_MANAGER, accountManager);

const borrowerContract = new web3.eth.Contract(
  ACCOUNT_MANAGER,
  bowrowerContractAddress
);

let collPrice;

//Call Function liquidateAccounts From quickswap router contract
const fetchValues = async () => {
  try {
    const fetchLowestCrAccounts = await borrowerContract.methods
      .getCollPrice()
      .call()
      .then((value) => {
        collPrice = value;
      })
      .then(async () => {
        try {
          await multiAccountGetterContractInitiate.methods
            .getMultipleSortedAccounts(-1, 5)
            .call()
            .then(async (value) => {
              value.map(async ({ coll, owner, debt }) => {
                const Collateral = coll * 1e-18;
                const Debt = debt * 1e-18;
                const CollPrice = Collateral * collPrice * 1e-18;
                const CrRatio = (Collateral * CollPrice) / Debt;
                const ownerAccount = [owner];

                console.log(CrRatio);

                console.table([
                  { ownerAccount, Collateral, Debt, CollPrice, CrRatio },
                ]);

                if (CrRatio > 110) {
                  console.log(ownerAccount[0]);
                  try {
                    const liquidate = await accountmanager.methods
                      .liquidate(ownerAccount[0])
                      .send({
                        from: adminAddress,
                      });
                    console.log(liquidate);
                  } catch (error) {
                    console.log(error);
                  }
                  return;
                } else {
                  console.log()
                  return;
                }
              });
            });
        } catch (error) {
          console.log(error);
        }
      });
  } catch (error) {
    console.log(error);
  }
};

setInterval(fetchValues, 12000);

//to liquidate single account
// const liquidateSingleAccount = async () => {
//   try {
//     const liquidate = await accountmanager.methods
//       .liquidate("0x113Fca29bE47647c26B4E9b5dFA040c4b2dFD11b")
//       .send({
//         from: adminAddress,
//       });
//     console.log(liquidate);
//   } catch (error) {
//     console.log(error);
//   }
// };

// liquidateSingleAccount();
// fetchValues();
// batchLiquidateAccounts();
