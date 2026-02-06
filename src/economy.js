const drinks = {
  beer:[1,3],
  vodka:[3,6],
  whiskey:[2,5],
  rum:[2,4],
  moonshine:[-5,8]
};
function roll(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
module.exports = { drinks, roll };
