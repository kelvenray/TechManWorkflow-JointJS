const fs = require('fs');
const path = require('path');
const https = require('https');

// 创建目录
const libDir = path.join(__dirname, 'js', 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// 要下载的库
const libraries = [
  {
    name: 'jquery-3.7.1.min.js',
    url: 'https://code.jquery.com/jquery-3.7.1.min.js'
  },
  {
    name: 'underscore-1.13.6.min.js',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.6/underscore-min.js'
  },
  {
    name: 'backbone-1.4.1.min.js',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/backbone.js/1.4.1/backbone-min.js'
  },
  {
    name: 'jointjs-3.7.7.min.js',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/jointjs/3.7.7/joint.min.js'
  },
  {
    name: 'jointjs-3.7.7.min.css',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/jointjs/3.7.7/joint.min.css'
  }
];

// 下载文件函数
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}, status code: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${destination}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {}); // 删除部分下载的文件
      reject(err);
    });
    
    file.on('error', (err) => {
      fs.unlink(destination, () => {}); // 删除部分下载的文件
      reject(err);
    });
  });
}

// 下载所有库
async function downloadAllLibraries() {
  console.log('开始下载库文件...');
  
  for (const lib of libraries) {
    const destination = path.join(libDir, lib.name);
    try {
      await downloadFile(lib.url, destination);
    } catch (error) {
      console.error(`Error downloading ${lib.name}:`, error.message);
    }
  }
  
  console.log('所有库文件下载完成！');
}

// 执行下载
downloadAllLibraries();
