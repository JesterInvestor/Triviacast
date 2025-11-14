import { expect } from "chai";
import { ethers } from "hardhat";

describe("StakingRewards", function () {
  it("allows staking, notifies rewards, and pays out rewards over time", async function () {
    const [deployer, distributor, alice] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const stakingToken = await Mock.deploy("Stake Token", "STK");
    await stakingToken.deployed();

    const rewardsToken = await Mock.deploy("Reward Token", "RWD");
    await rewardsToken.deployed();

    // deploy staking contract
    const Staking = await ethers.getContractFactory("StakingRewards");
    const staking = await Staking.deploy(rewardsToken.address, stakingToken.address);
    await staking.deployed();

    // set rewardsDistribution to distributor (use `any` to avoid TS contract typing issues)
    const stakingAsAny = staking as any;
    await stakingAsAny.connect(deployer).setRewardsDistribution(distributor.address);

    // mint tokens to alice and to distributor for rewards
    const stakeAmount = (ethers as any).utils.parseEther("1000");
    await stakingToken.mint(alice.address, stakeAmount);
    const rewardSupply = (ethers as any).utils.parseEther("10000");
    await rewardsToken.mint(distributor.address, rewardSupply);

    // alice approves and stakes
    await (stakingToken as any).connect(alice).approve(staking.address, stakeAmount);
    await stakingAsAny.connect(alice).stake(stakeAmount);

    expect((await staking.totalSupply()).toString()).to.equal(stakeAmount.toString());
    expect((await staking.balanceOf(alice.address)).toString()).to.equal(stakeAmount.toString());

    // distributor funds staking contract with rewards and notifies reward amount
    // transfer rewards to staking contract
    const fundAmount = (ethers as any).utils.parseEther("7000");
    await (rewardsToken as any).connect(distributor).transfer(staking.address, fundAmount);

    // call notifyRewardAmount as distributor
    await stakingAsAny.connect(distributor).notifyRewardAmount(fundAmount);

    // fast forward half the reward duration (default 7 days => 3.5 days)
    const sevenDays = 7 * 24 * 3600;
    await ethers.provider.send("evm_increaseTime", [sevenDays / 2]);
    await ethers.provider.send("evm_mine", []);

    // earned should be > 0
    const earned = await stakingAsAny.earned(alice.address);
    expect(earned).to.be.gt(0);

    // alice claims rewards
    const beforeBal = await (rewardsToken as any).balanceOf(alice.address);
    await stakingAsAny.connect(alice).getReward();
    const afterBal = await (rewardsToken as any).balanceOf(alice.address);
    expect(afterBal).to.be.gt(beforeBal);

    // withdraw stake
    await stakingAsAny.connect(alice).withdraw(stakeAmount);
    expect((await stakingAsAny.balanceOf(alice.address))).to.equal(0);
  });
});
