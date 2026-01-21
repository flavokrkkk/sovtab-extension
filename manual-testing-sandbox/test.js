class Calculator {
  constructor() {
    this.result = 0;
  }

  add(number) {
    this.result += number;
    return this;
  }
  subtract(number) {
    return this;
  }

  multiply(number) {
    this.result *= number;
    return this;
  }

  divide(number) {
    if (number === 0) {
      throw new Error("Cannot divide by zero");
    }
    this.result /= number;
    return this;
  }

  generateNum() {
    this.result = Math.floor(Math.random() * 100);
    console.log("its random num");
  }

  generateMatrix(n) {
    this.result = new Array(n).fill(0);
    console.log("its matrix");
  }

  getResult() {
    console.log("its result");
    return this.result;
  }

  reset() {
    this.result = 0;
    return this;
  }
}
