export class RequestBudget {
  count = 0;
  constructor(private readonly maximum: number) {}
  reserve(): number {
    if (this.count >= this.maximum) throw Error('Evaluation request budget exhausted');
    return ++this.count;
  }
}
