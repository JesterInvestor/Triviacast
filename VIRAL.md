# How to Build Viral Mini Apps

A developer’s guide to designing user experiences that spread naturally through Farcaster’s social graph using Neynar’s infrastructure

Many developers treat Farcaster mini apps like regular web apps that happen to live inside a social client. This fundamentally misses the unique opportunity of building on Farcaster. You’re not just building an app; you’re building inside a social network with rich user context, established social graphs, and a built-in crypto wallet.
The mini apps that go viral understand this distinction. They’re designed around social mechanics and financial incentives from the ground up, not bolted on as an afterthought.

## Design Principles

### #1: Think Social-First, Not Social-Added
The traditional approach treats social features as an afterthought—build your app first, then add sharing later. Viral mini apps flip this paradigm by designing around social mechanics from day one, with every feature leveraging the user’s social graph and network effects. Here are some practical examples:

- Social competition: In addition to a traditional leaderboard of all users, use Neynar’s following API to query the accounts your users follow. Generic competition is boring; social competition is addictive. Show “3 people you follow are also playing” and their high scores, maybe allow users to challenge their friends or mutual follows, and suddenly your leaderboard becomes a much more rewarding experience.
- Personalized onboarding: When someone opens your app, immediately show them which of their friends are already using it. Encourage them to join or challenge their friends to get them started.
- Friend activity feeds: Don’t just show what happened in your app - show what their network is doing through notifications, activity feeds, or popups/modals. “Your friend @charlie just completed a challenge” or “Hey @alice! @bob just beat your high score” creates FOMO and natural engagement.

### #2: Make Sharing Inevitable
Viral mini apps can be thought of as effortless sharing engines - they don’t ask users to share, they make sharing the obvious next step.

- Dynamic Share Pages  
  Every achievement should generate a custom share URL with a user-specific embed image that serves dual purposes: celebration for the user and invitation for their network. Use the Neynar Starter Kit to get this functionality out-of-the-box, or build it yourself using Neynar’s APIs to pull in user avatars, usernames, and social proof.  
  Structure your dynamically generated share image like this:
  - Hero moment: “You just beat 89% of players!”
  - Social proof: Show profile pics of friends who also played using their social graph
  - Relevant entry point: Clicking the “launch” button can send a new user directly to a page of your mini app challenging or referencing the user sharing the mini app, for example

- Smart Cast Composition  
  Don’t just share generic messages. Pre-fill the cast composer with social graph data to craft contextual casts for your users:
  - First achievement: “I just did X in this app and thought you would like it @friend1 @friend2 @friend3”
  - Beat a friend: “Just beat @friend’s score in [app]!”
  - Clear invitation: “Challenge your friends” cast pre-filled with tags of their best friends (as demonstrated in the Neynar Starter Kit using the best friends API)

- The “Share to Claim” Pattern  
  Create exclusive rewards tied to social actions. This isn’t about forcing sharing - it’s about making sharing valuable. Use Neynar’s casts API or reactions API and the wallet integration to create real financial incentives, either with established ERC20 tokens, or with reward tokens or NFTs made just for your app:
  - Bonus rewards for shares that get engagement or accounts that have more followers
  - Collaborative minting where friend groups unlock rewards together
  - Time-limited tokens tied to viral moments
  - Exclusive tokens or NFTs minted only for users who share

### #3: Send Notifications That Bring Users Back
Smart Re-engagement Through Social Triggers

Neynar’s notification system lets you reach users in their