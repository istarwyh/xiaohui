---
title: Optimal Stopping and Position Discipline
description: An initial English draft connecting the secretary problem to investment observation windows, position discipline, and action triggers.
lang: en
source: invest/最优停止与仓位纪律
translationKey: optimal-stopping-position-discipline
translationStatus: machine-draft
created: 2026-06-28
modified: 2026-06-29
published: 2026-06-28
tags:
  - invest
  - optimal stopping
  - position management
rss: false
---

The "largest corn" problem is essentially the classic `secretary problem`, also known as the optimal stopping problem.

Suppose there are `n` ears of corn in a field. You can only move forward, cannot go back, and can pick only once. The goal is to maximize the chance of picking the largest one.

The optimal strategy is:

First observe about `1/e = 36.8%` of the corn without picking. After that, pick the first ear that is larger than every one observed before.

The important assumption is not that corn size follows a normal or uniform distribution. The assumption is that the relative order of corn size along the path is uniformly random.

## Why 1/e

Let the first `m` items be the observation window. After that, pick the first item that exceeds all previous items.

If the largest item appears at position `k`, where `k > m`, success requires that the largest item among positions `1` to `k - 1` appeared inside the first `m` observation items. Otherwise, a local maximum before the true maximum would have triggered the pick.

For large `n`, the success probability is approximately:

```text
P(x) = -x ln x
```

The maximum occurs at:

```text
x = 1/e
```

This strategy does not guarantee success. It only maximizes the probability of success, and that maximum probability is also about `1/e`.

## Investment Implication

The model cannot be copied directly into stock markets.

Markets do not satisfy the secretary problem assumptions. Opportunities are not fixed in number, prices are not randomly ordered, you can trade multiple times, information keeps updating, and prices have trend, mean reversion, liquidity, policy shocks, and transaction costs.

But the model gives an important decision structure:

**Explore first, then exploit. Build a ruler before acting.**

The dangerous action in investing is often not being wrong, but betting before forming a ruler:

- treating one rally as a trend;
- treating one pullback as a crisis;
- mistaking one valuation expansion for long-term understanding;
- adding or reducing position without an observation window, trigger, or exit condition.

## Core Claim

Good action does not begin with "I feel an opportunity is here." It begins with "what should I observe, how do I build a benchmark, and what signal is strong enough to trigger action?"
