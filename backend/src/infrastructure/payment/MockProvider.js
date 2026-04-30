export class MockProvider {
  async initiate(order) {
    return {
      method: 'mock',
      instruction: 'Click confirm to complete (demo mode)',
      amount: Number(order.total_amount),
    };
  }

  async verify() { return true; }
}
