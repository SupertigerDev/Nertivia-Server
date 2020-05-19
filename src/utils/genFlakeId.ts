const FlakeId = require('flakeid');

interface IFlakeId {
  gen: () => string
}

const flake: IFlakeId = new FlakeId();

export default flake

