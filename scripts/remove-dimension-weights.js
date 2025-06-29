const fs = require('fs');
const path = require('path');

// 数据文件路径
const dataFilePath = path.join(__dirname, '../data/scoring-data.json');

console.log('开始移除面试维度权重字段...');

try {
  // 读取数据文件
  const rawData = fs.readFileSync(dataFilePath, 'utf8');
  const data = JSON.parse(rawData);
  
  let modifiedCount = 0;
  
  // 移除面试维度中的权重字段
  if (data.interviewDimensions && Array.isArray(data.interviewDimensions)) {
    data.interviewDimensions.forEach(dimension => {
      if (dimension.hasOwnProperty('weight')) {
        delete dimension.weight;
        modifiedCount++;
        console.log(`移除维度 "${dimension.name}" 的权重字段`);
      }
    });
  }
  
  if (modifiedCount > 0) {
    // 创建备份
    const backupPath = dataFilePath + '.backup-remove-weights-' + Date.now();
    fs.copyFileSync(dataFilePath, backupPath);
    console.log(`创建备份文件: ${backupPath}`);
    
    // 保存修改后的数据
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    console.log(`修改完成！共移除 ${modifiedCount} 个权重字段`);
    
    // 显示当前面试维度总分
    const totalScore = data.interviewDimensions
      .filter(d => d.isActive)
      .reduce((sum, d) => sum + d.maxScore, 0);
    console.log(`当前面试总分: ${totalScore}分`);
    
    if (totalScore !== 100) {
      console.log('⚠️  建议调整各维度分数使总分为100分');
    }
  } else {
    console.log('没有发现需要移除的权重字段');
  }
  
} catch (error) {
  console.error('处理数据时出错:', error);
  process.exit(1);
}
