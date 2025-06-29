const fs = require('fs');
const path = require('path');

// 数据文件路径
const dataFilePath = path.join(__dirname, '../data/scoring-data.json');

console.log('开始修复评分数据类型问题...');

try {
  // 读取数据文件
  const rawData = fs.readFileSync(dataFilePath, 'utf8');
  const data = JSON.parse(rawData);
  
  let fixedCount = 0;
  
  // 修复候选人评分数据
  if (data.candidates && Array.isArray(data.candidates)) {
    data.candidates.forEach(candidate => {
      if (candidate.scores && Array.isArray(candidate.scores)) {
        candidate.scores.forEach(score => {
          // 修复 totalScore 类型
          if (typeof score.totalScore === 'string') {
            score.totalScore = Number(score.totalScore) || 0;
            fixedCount++;
            console.log(`修复候选人 ${candidate.name} 的评分 totalScore: ${score.totalScore}`);
          }
          
          // 修复 categories 类型
          if (typeof score.categories === 'string') {
            // 如果 categories 是字符串，尝试解析为数字或创建默认结构
            const numValue = Number(score.categories) || 0;
            score.categories = { "1": numValue }; // 假设是第一个维度的分数
            fixedCount++;
            console.log(`修复候选人 ${candidate.name} 的评分 categories: ${JSON.stringify(score.categories)}`);
          } else if (score.categories && typeof score.categories === 'object') {
            // 确保 categories 对象中的值都是数字
            Object.keys(score.categories).forEach(key => {
              if (typeof score.categories[key] === 'string') {
                score.categories[key] = Number(score.categories[key]) || 0;
                fixedCount++;
              }
            });
          }
        });
      }
      
      // 修复 totalScore 类型
      if (typeof candidate.totalScore === 'string') {
        candidate.totalScore = Number(candidate.totalScore) || 0;
        fixedCount++;
        console.log(`修复候选人 ${candidate.name} 的 totalScore: ${candidate.totalScore}`);
      }
      
      // 修复 finalScore 类型
      if (typeof candidate.finalScore === 'string') {
        candidate.finalScore = Number(candidate.finalScore) || 0;
        fixedCount++;
        console.log(`修复候选人 ${candidate.name} 的 finalScore: ${candidate.finalScore}`);
      }
      
      // 修复其他成绩的分数类型
      if (candidate.otherScores && Array.isArray(candidate.otherScores)) {
        candidate.otherScores.forEach(otherScore => {
          if (typeof otherScore.score === 'string') {
            otherScore.score = Number(otherScore.score) || 0;
            fixedCount++;
            console.log(`修复候选人 ${candidate.name} 的其他成绩 ${otherScore.itemName}: ${otherScore.score}`);
          }
        });
      }
    });
  }
  
  // 修复面试维度的数值类型
  if (data.interviewDimensions && Array.isArray(data.interviewDimensions)) {
    data.interviewDimensions.forEach(dimension => {
      if (typeof dimension.maxScore === 'string') {
        dimension.maxScore = Number(dimension.maxScore) || 0;
        fixedCount++;
      }
      if (typeof dimension.weight === 'string') {
        dimension.weight = Number(dimension.weight) || 0;
        fixedCount++;
      }
      if (typeof dimension.order === 'string') {
        dimension.order = Number(dimension.order) || 0;
        fixedCount++;
      }
    });
  }
  
  // 修复成绩项目的数值类型
  if (data.scoreItems && Array.isArray(data.scoreItems)) {
    data.scoreItems.forEach(item => {
      if (typeof item.maxScore === 'string') {
        item.maxScore = Number(item.maxScore) || 0;
        fixedCount++;
      }
      if (typeof item.weight === 'string') {
        item.weight = Number(item.weight) || 0;
        fixedCount++;
      }
      if (typeof item.order === 'string') {
        item.order = Number(item.order) || 0;
        fixedCount++;
      }
    });
  }
  
  if (fixedCount > 0) {
    // 创建备份
    const backupPath = dataFilePath + '.backup-' + Date.now();
    fs.copyFileSync(dataFilePath, backupPath);
    console.log(`创建备份文件: ${backupPath}`);
    
    // 保存修复后的数据
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    console.log(`修复完成！共修复 ${fixedCount} 个数据类型问题`);
  } else {
    console.log('没有发现需要修复的数据类型问题');
  }
  
} catch (error) {
  console.error('修复数据时出错:', error);
  process.exit(1);
}
