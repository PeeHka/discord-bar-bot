const drinks = {
  пиво:[1,3],
  водка:[3,6],
  виски:[2,5],
  ром:[2,4],
  самогон:[-5,8]
};

function roll(min,max){
  return Math.floor(Math.random()*(max-min+1))+min;
}

module.exports = { drinks, roll };
