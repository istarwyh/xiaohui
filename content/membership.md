---
title: 私人成长会员
description: 与晓灰深度交流 AI Agent、分布式系统、职业成长
---

<div class="membership-header">
  <span class="page-label">MEMBERSHIP</span>
  <h1>私人成长会员</h1>
  <p class="header-desc">如果你读过我的文章，对我分享的内容感兴趣，这里是一个更深入交流的方式。</p>
</div>

---

## 为什么做这件事

我在大厂工作了七年，从淘宝到蚂蚁，经历过财务系统重构、知识库建设、AI Agent 落地。这些年踩过的坑、总结的方法论，散落在各处笔记里。

我一直相信，**最有价值的知识往往不在公开文档里，而在私下的对话中**。那些「为什么这样设计」「当时怎么想的」「如果重来会怎么做」，才是真正有用的东西。

所以我想建立一个小圈子，和真正感兴趣的人深度交流。

---

## 你会得到什么

<div class="benefit-grid">
  <div class="benefit-item">
    <h3>一对一交流</h3>
    <p>职业规划、技术选型、架构设计、面试准备。预约时间，我们深聊一次。</p>
  </div>
  <div class="benefit-item">
    <h3>私密社群</h3>
    <p>一个小而精的圈子。分享行业动态、技术见解、以及那些不适合公开说的话。</p>
  </div>
  <div class="benefit-item">
    <h3>直播与分享</h3>
    <p>不定期的技术直播。AI Agent 实战、系统设计、大厂工作方法论。</p>
  </div>
  <div class="benefit-item">
    <h3>内推机会</h3>
    <p>阿里、蚂蚁的内推通道。简历优化建议，面试流程指导。</p>
  </div>
</div>

---

## 价格

<div class="price-section">
  <div class="price-amount">$29</div>
  <p class="price-note">一次付费，长期有效</p>
</div>

---

## 加入方式

通过 PayPal 完成支付：

<div id="paypal-button-container"></div>

<script src="https://www.paypal.com/sdk/js?client-id=AXG0eXyV4Vq75GQM_fgZCOg2iLap23SYGfcKbYV3abOvmXbbEGrDAKT7GJ3UayxrYwSQFTF2bi0Aca7n&currency=USD"></script>
<script>
  paypal.Buttons({
    style: {
      shape: 'rect',
      color: 'blue',
      layout: 'vertical',
      label: 'pay'
    },
    createOrder: function(data, actions) {
      return actions.order.create({
        purchase_units: [{
          description: '晓灰私人成长会员 - 终身会员',
          amount: {
            value: '29.00',
            currency_code: 'USD'
          }
        }]
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        alert('支付成功！感谢您的支持，' + details.payer.name.given_name + '！我们将在24小时内通过邮件联系您。');
        // 可以在这里添加发送通知的逻辑
      });
    },
    onError: function(err) {
      console.error('PayPal 支付错误:', err);
      alert('支付过程中出现错误，请稍后重试或联系 talk@xiaohui.cool');
    }
  }).render('#paypal-button-container');
</script>

支付成功后，将 PayPal 确认邮件转发至 **talk@xiaohui.cool**，我会在 24 小时内回复你。

---

## 常见问题

**支付后多久能收到？** 通常 24 小时内。

**支持哪些支付方式？** PayPal（支持信用卡、借记卡）。

**可以退款吗？** 支付后不支持退款，请确认后再购买。

---

## 联系我

有任何问题，随时邮件联系：**talk@xiaohui.cool**

<style>
/* Brutalist / Editorial Style */

.membership-header {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--lightgray);
}

.page-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--gray);
  display: block;
  margin-bottom: 0.5rem;
}

.membership-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  letter-spacing: -0.02em;
}

.header-desc {
  font-size: 1.1rem;
  color: var(--darkgray);
  margin: 0;
  max-width: 600px;
}

/* Benefit Grid */
.benefit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin: 2rem 0;
}

.benefit-item {
  padding: 1.5rem 0;
  border-top: 2px solid var(--dark);
}

.benefit-item h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.benefit-item p {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--darkgray);
  margin: 0;
}

/* Price Section */
.price-section {
  margin: 2rem 0;
  padding: 2rem 0;
  border-top: 3px solid var(--dark);
  border-bottom: 1px solid var(--lightgray);
}

.price-amount {
  font-size: 4rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.price-note {
  font-size: 0.9rem;
  color: var(--gray);
  margin: 0;
}

#paypal-button-container {
  max-width: 350px;
  margin: 1.5rem 0;
}

/* Responsive */
@media (max-width: 768px) {
  .membership-header h1 {
    font-size: 2rem;
  }
  
  .benefit-grid {
    grid-template-columns: 1fr;
  }
  
  .price-amount {
    font-size: 3rem;
  }
}
</style>
