import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("SimpleStaking", function () {
  let owner: any, user: any, other: any;
  let token: any, token2: any, staking: any;

  const toUnits = (n: string) => ethers.parseUnits(n, 18);

  beforeEach(async () => {
    [owner, user, other] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TRIVToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    // Mint some tokens for user and owner
    await token.connect(owner).mint(user.address, toUnits("1000"));
    await token.connect(owner).mint(owner.address, toUnits("1000"));

    // second token to test recoverERC20
    const Token2 = await ethers.getContractFactory("TRIVToken");
    token2 = await Token2.deploy();
    await token2.waitForDeployment();
    await token2.connect(owner).mint(owner.address, toUnits("1000"));

    const Staking = await ethers.getContractFactory("SimpleStaking");
    staking = await Staking.deploy(await token.getAddress(), await token.getAddress());
    await staking.waitForDeployment();
  });

  it("allows staking and withdrawing", async () => {
    const stakeAmount = toUnits("100");
    // approve then stake
    await token.connect(user).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(user).stake(stakeAmount);

    expect(await staking.totalSupply()).to.equal(stakeAmount);
    expect(await staking.balanceOf(user.address)).to.equal(stakeAmount);

    // withdraw partial
    await staking.connect(user).withdraw(toUnits("40"));
    expect(await staking.totalSupply()).to.equal(toUnits("60"));
    expect(await staking.balanceOf(user.address)).to.equal(toUnits("60"));
  });

  it("distributes rewards and allows claim and exit", async () => {
    // owner funds rewards
    const reward = toUnits("1000");
    const duration = 100; // seconds

    // user stakes 100
    await token.connect(user).approve(await staking.getAddress(), toUnits("100"));
    await staking.connect(user).stake(toUnits("100"));

    // owner approves and notifies reward
    await token.connect(owner).approve(await staking.getAddress(), reward);
    await staking.connect(owner).notifyRewardAmount(reward, duration);

    // advance 50 seconds
    await hre.network.provider.send("evm_increaseTime", [50]);
    await hre.network.provider.send("evm_mine");

    // claim reward
    const expected = await staking.earned(user.address);
    const rewardRate = await staking.rewardRate();
    const before = await token.balanceOf(user.address);
    await staking.connect(user).claimReward();
    const after = await token.balanceOf(user.address);
    const diff = after - before;
    // The claim transaction may be mined in the next block causing up to +rewardRate extra
    if (diff !== expected && diff !== (expected + rewardRate)) {
      expect(diff).to.equal(expected);
    }

    // test exit (stake none left so withdraw + claim safe)
    // stake again small
    await token.connect(user).approve(await staking.getAddress(), toUnits("10"));
    await staking.connect(user).stake(toUnits("10"));
    await hre.network.provider.send("evm_increaseTime", [10]);
    await hre.network.provider.send("evm_mine");
    await staking.connect(user).exit();
    // after exit, user should have no staked balance
    expect(await staking.balanceOf(user.address)).to.equal(0n);
  });

  it("pauses and unpauses staking", async () => {
    await staking.connect(owner).pause();
    await token.connect(user).approve(await staking.getAddress(), toUnits("1"));
    await expect(staking.connect(user).stake(toUnits("1"))).to.be.reverted;
    await staking.connect(owner).unpause();
    await staking.connect(user).stake(toUnits("1"));
    expect(await staking.balanceOf(user.address)).to.equal(toUnits("1"));
  });

  it("allows owner to recover non-staking tokens", async () => {
    // send token2 into staking contract
    await token2.connect(owner).mint(await staking.getAddress(), toUnits("200"));
    // owner recovers token2
    const before = await token2.balanceOf(owner.address);
    await staking.connect(owner).recoverERC20(await token2.getAddress(), owner.address, toUnits("100"));
    const after = await token2.balanceOf(owner.address);
    expect(after - before).to.equal(toUnits("100"));
  });

  it("refuses to recover staking or reward token", async () => {
    await expect(
      staking.connect(owner).recoverERC20(await token.getAddress(), owner.address, toUnits("1"))
    ).to.be.reverted;
  });
});
