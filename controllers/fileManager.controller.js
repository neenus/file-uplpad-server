// Original source code is from Syncfusion filemanager node filesystem
// https://github.com/SyncfusionExamples/ej2-filemanager-node-filesystem
// made some refactoring to the code to integrate it with my backend server

import fs from "fs";
import path from "path";
import archiver from "archiver";

let size = 0;
let copyName = "";
let location = "";
let isRenameChecking = false;
let accessDetails = null;
let rootName = "";
const pattern = /(\.\.\/)/g;

let permission = {
  Allow: "allow",
  Deny: "deny"
};

class AccessDetails {
  constructor(role, rules) {
    this.role = role;
    this.rules = rules;
  }
}

class AccessPermission {
  constructor(read, write, writeContents, copy, download, upload, message) {
    this.read = read;
    this.write = write;
    this.writeContents = writeContents;
    this.copy = copy;
    this.download = download;
    this.upload = upload;
    this.message = message
  }
}

class AccessRules {
  constructor(path, role, read, write, writeContents, copy, download, upload, isFile, message) {
    this.path = path;
    this.role = role;
    this.read = read;
    this.write = write;
    this.writeContents = writeContents;
    this.copy = copy;
    this.download = download;
    this.upload = upload;
    this.isFile = isFile;
    this.message = message
  }
}


// ============================ File Manager Helper Methods ============================
export const GetContentRootPath = (req, res) => {
  const contentRootPath = `${process.cwd()}/storage/${req.params.dir}/`;
  return contentRootPath;
}

/**
 * Reads text from the file asynchronously and returns a Promise.
 */
const GetFiles = async (req, res) => {
  const contentRootPath = GetContentRootPath(req, res);
  return new Promise((resolve, reject) => {
    const directory = contentRootPath + req.body.path.replace(pattern, "");
    fs.readdir(directory, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

/**
 * 
 * function to check for exising folder or file
 */
const checkForDuplicates = (directory, name, isFile) => {
  const filenames = fs.readdirSync(directory);
  if (filenames.includes(name)) {
    for (const filename of filenames) {
      if (filename === name) {
        const filePath = path.join(directory, filename);
        const isDirectory = fs.lstatSync(filePath).isDirectory();
        if ((!isFile && isDirectory) || (isFile && !isDirectory)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * function to rename the folder
 */
const renameFolder = async (req, res) => {
  const contentRootPath = GetContentRootPath(req, res);
  try {
    const oldName = req.body.data[0].name;
    const newName = req.body.newName;
    const permission = getPermission(contentRootPath + req.body.data[0].filterPath, oldName, req.body.data[0].isFile, contentRootPath, req.body.data[0].filterPath);
    if (permission != null && (!permission.read || !permission.write)) {
      const errorMsg = new Error();
      errorMsg.message = permission.message !== "" ? permission.message : `${getFileName(contentRootPath + req.body.data[0].filterPath + oldName)} is not accessible. You need permission to perform the write action.`;
      errorMsg.code = "401";
      const response = { error: errorMsg };
      res.setHeader('Content-Type', 'application/json');
      res.json(JSON.stringify(response));
    } else {
      const oldDirectoryPath = path.join(contentRootPath + req.body.data[0].filterPath + "/", oldName);
      const newDirectoryPath = path.join(contentRootPath + req.body.data[0].filterPath + "/", newName);
      if (checkForDuplicates(contentRootPath + req.body.data[0].filterPath, newName, req.body.data[0].isFile)) {
        const errorMsg = new Error();
        errorMsg.message = `A file or folder with the name ${req.body.name} already exists.`;
        errorMsg.code = "400";
        const response = { error: errorMsg };
        res.setHeader('Content-Type', 'application/json');
        res.json(JSON.stringify(response));
      } else {
        fs.renameSync(oldDirectoryPath, newDirectoryPath);
        const data = await FileManagerDirectoryContent(req, res, newDirectoryPath + req.body.path);
        const response = { files: data };
        res.setHeader('Content-Type', 'application/json');
        res.json(JSON.stringify(response));
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
/**
 * function to delete the folder
 */
const deleteFolder = (req, res, contentRootPath) => {
  const deleteFolderRecursive = (path) => {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((file) => {
        const curPath = path + "/" + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  };

  let permissionDenied = false;
  req.body.data.forEach((item) => {
    const fromPath = contentRootPath + item.filterPath;
    const permission = getPermission(fromPath, item.name, item.isFile, contentRootPath, item.filterPath);
    if (permission != null && (!permission.read || !permission.write)) {
      permissionDenied = true;
      const errorMsg = new Error();
      errorMsg.message = permission.message !== "" ? permission.message : `${item.name} is not accessible. You need permission to perform the write action.`;
      errorMsg.code = "401";
      const response = { error: errorMsg };
      res.setHeader("Content-Type", "application/json");
      res.json(JSON.stringify(response));
    }
  });

  if (!permissionDenied) {
    const promiseList = req.body.data.map((item) => {
      const newDirectoryPath = path.join(contentRootPath + item.filterPath, item.name);
      if (fs.lstatSync(newDirectoryPath).isFile()) {
        return FileManagerDirectoryContent(req, res, newDirectoryPath, item.filterPath);
      } else {
        return FileManagerDirectoryContent(req, res, newDirectoryPath + "/", item.filterPath);
      }
    });

    Promise.all(promiseList).then((data) => {
      data.forEach((files) => {
        if (fs.lstatSync(path.join(contentRootPath + files.filterPath, files.name)).isFile()) {
          fs.unlinkSync(path.join(contentRootPath + files.filterPath, files.name));
        } else {
          deleteFolderRecursive(path.join(contentRootPath + files.filterPath, files.name));
        }
      });

      const response = { files: data };
      res.setHeader("Content-Type", "application/json");
      res.json(JSON.stringify(response));
    });
  }
};
/**
 * function to create the folder
 */
const createFolder = (req, res, filepath, contentRootPath) => {
  const newDirectoryPath = path.join(contentRootPath + req.body.path, req.body.name);
  const pathPermission = getPathPermission(false, req.body.data[0].name, filepath, contentRootPath, req.body.data[0].filterPath);
  if (pathPermission != null && (!pathPermission.read || !pathPermission.writeContents)) {
    const errorMsg = new Error();
    errorMsg.message = (pathPermission.message !== "") ? pathPermission.message : req.body.data[0].name + " is not accessible. You need permission to perform the writeContents action.";
    errorMsg.code = "401";
    const response = { error: errorMsg };
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
  } else {
    if (fs.existsSync(newDirectoryPath)) {
      const errorMsg = new Error();
      errorMsg.message = "A file or folder with the name " + req.body.name + " already exists.";
      errorMsg.code = "400";
      const response = { error: errorMsg };
      res.setHeader('Content-Type', 'application/json');
      res.json(response);
    } else {
      fs.mkdirSync(newDirectoryPath);
      FileManagerDirectoryContent(req, res, newDirectoryPath).then(data => {
        const response = { files: data };
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
      });
    }
  }
}
/**
 * function to get the file details like path, name and size
 */
const fileDetails = (req, res, filepath) => {
  return new Promise((resolve, reject) => {
    fs.stat(filepath, function (err, stats) {
      if (err) {
        reject(err);
      } else {
        const cwd = {
          name: path.basename(filepath),
          size: getSize(stats.size),
          isFile: stats.isFile(),
          modified: stats.ctime,
          created: stats.mtime,
          type: path.extname(filepath),
          location: req.body.data[0].filterPath
        };
        resolve(cwd);
      }
    });
  });
}

/** 
 * function to get the folder size
 */
const getFolderSize = (req, res, directory, sizeValue) => {
  let size = sizeValue;
  const filenames = fs.readdirSync(directory);
  for (let i = 0; i < filenames.length; i++) {
    const filePath = path.join(directory, filenames[i]);
    if (fs.lstatSync(filePath).isDirectory()) {
      size = getFolderSize(req, res, filePath, size);
    } else {
      const stats = fs.statSync(filePath);
      size += stats.size;
    }
  }
  return size;
}

/**
 * function to get the size in kb, MB
 */
const getSize = (size) => {
  let hz;
  if (size < 1024) {
    hz = size + ' B';
  } else if (size < 1024 * 1024) {
    hz = (size / 1024).toFixed(2) + ' KB';
  } else if (size < 1024 * 1024 * 1024) {
    hz = (size / 1024 / 1024).toFixed(2) + ' MB';
  } else {
    hz = (size / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }
  return hz;
}

const checkForMultipleLocations = (req, contentRootPath) => {
  let previousLocation = "";
  let isMultipleLocation = false;
  req.body.data.forEach((item) => {
    if (previousLocation === "") {
      previousLocation = item.filterPath;
      location = item.filterPath;
    } else if (previousLocation === item.filterPath && !isMultipleLocation) {
      isMultipleLocation = false;
      location = item.filterPath;
    } else {
      isMultipleLocation = true;
      location = "Various Location";
    }
  });
  if (!isMultipleLocation) {
    location = contentRootPath.split("/")[contentRootPath.split("/").length - 1] + location.substr(0, location.length - 2);
  }
  return isMultipleLocation;
}

const getFileDetails = async (req, res, contentRootPath, filterPath) => {
  let isNamesAvailable = req.body.names.length > 0;
  if (req.body.names.length === 0 && req.body.data.length !== 0) {
    const nameValues = req.body.data.map(item => item.name);
    req.body.names = nameValues;
  }
  if (req.body.names.length === 1) {
    const data = await fileDetails(req, res, contentRootPath + (isNamesAvailable ? req.body.names[0] : ""));
    if (!data.isFile) {
      data.size = await getFolderSize(req, res, contentRootPath + (isNamesAvailable ? req.body.names[0] : ""), 0);
    }
    if (filterPath === "") {
      data.location = path.join(filterPath, req.body.names[0]).substr(0, path.join(filterPath, req.body.names[0]).length);
    } else {
      data.location = path.join(rootName, filterPath, req.body.names[0]);
    }
    const response = { details: data };
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
  } else {
    let isMultipleLocations = checkForMultipleLocations(req, contentRootPath);
    const sizes = await Promise.all(req.body.names.map(item => {
      if (fs.lstatSync(contentRootPath + item).isDirectory()) {
        return getFolderSize(req, res, contentRootPath + item, size);
      } else {
        const stats = fs.statSync(contentRootPath + item);
        return stats.size;
      }
    }));
    const data = await fileDetails(req, res, contentRootPath + req.body.names[0]);
    const names = req.body.names.map(name => {
      if (name.split("/").length > 0) {
        return name.split("/")[name.split("/").length - 1];
      } else {
        return name;
      }
    });
    data.name = names.join(", ");
    data.multipleFiles = true;
    data.size = getSize(sizes.reduce((acc, curr) => acc + curr, 0));
    if (filterPath === "") {
      data.location = path.join(rootName, filterPath).substr(0, path.join(rootName, filterPath).length - 1);
    } else {
      data.location = path.join(rootName, filterPath).substr(0, path.join(rootName, filterPath).length - 1);
    }
    const response = { details: data };
    res.setHeader('Content-Type', 'application/json');
    isMultipleLocations = false;
    location = "";
    res.json(response);
  }
}

const copyFolder = (source, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
  }
  const files = fs.readdirSync(source);
  files.forEach(function (file) {
    const curSource = path.join(source, file);
    const curDest = path.join(dest, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolder(curSource, curDest);
    } else {
      fs.copyFileSync(curSource, curDest, (err) => {
        if (err) throw err;
      });
    }
  });
}

const updateCopyName = (path, name, count, isFile) => {
  let subName = "";
  let extension = "";
  if (isFile) {
    extension = name.substr(name.lastIndexOf('.'), name.length - 1);
    subName = name.substr(0, name.lastIndexOf('.'));
  }
  copyName = !isFile ? `${name}(${count})` : `${subName}(${count})${extension}`;
  if (checkForDuplicates(path, copyName, isFile)) {
    count = count + 1;
    updateCopyName(path, name, count, isFile);
  }
};

const checkForFileUpdate = (fromPath, toPath, item, contentRootPath, req) => {
  let count = 1;
  let name = copyName = item.name;
  if (fromPath === toPath) {
    if (checkForDuplicates(contentRootPath + req.body.targetPath, name, item.isFile)) {
      updateCopyName(contentRootPath + req.body.targetPath, name, count, item.isFile);
    }
  } else {
    if (req.body.renameFiles.length > 0 && req.body.renameFiles.includes(item.name)) {
      updateCopyName(contentRootPath + req.body.targetPath, name, count, item.isFile);
    } else {
      if (checkForDuplicates(contentRootPath + req.body.targetPath, name, item.isFile)) {
        isRenameChecking = true;
      }
    }
  }
}
/**
 * function copyfile and folder
 */
const CopyFiles = (req, res, contentRootPath) => {
  const fileList = [];
  const replaceFileList = [];
  let permission;
  let pathPermission;
  let permissionDenied = false;
  pathPermission = getPathPermission(false, req.body.targetData.name, contentRootPath + req.body.targetPath, contentRootPath, req.body.targetData.filterPath);
  req.body.data.forEach(function (item) {
    const fromPath = contentRootPath + item.filterPath;
    permission = getPermission(fromPath, item.name, item.isFile, contentRootPath, item.filterPath);
    const fileAccessDenied = (permission != null && (!permission.read || !permission.copy));
    const pathAccessDenied = (pathPermission != null && (!pathPermission.read || !pathPermission.writeContents));
    if (fileAccessDenied || pathAccessDenied) {
      permissionDenied = true;
      const errorMsg = new Error();
      errorMsg.message = fileAccessDenied ? ((permission.message !== "") ? permission.message :
        item.name + " is not accessible. You need permission to perform the copy action.") :
        ((pathPermission.message !== "") ? pathPermission.message :
          req.body.targetData.name + " is not accessible. You need permission to perform the writeContents action.");
      errorMsg.code = "401";
      let response = { error: errorMsg };
      response = JSON.stringify(response);
      res.setHeader('Content-Type', 'application/json');
      res.json(response);
    }
  });
  if (!permissionDenied) {
    req.body.data.forEach(function (item) {
      const fromPath = contentRootPath + item.filterPath + item.name;
      let toPath = contentRootPath + req.body.targetPath + item.name;
      checkForFileUpdate(fromPath, toPath, item, contentRootPath, req);
      if (!isRenameChecking) {
        toPath = contentRootPath + req.body.targetPath + copyName;
        if (item.isFile) {
          try {
            fs.copyFileSync(path.join(fromPath), path.join(toPath));
          } catch (err) {
            // Handle the error
            console.error(err);
          }
        }
        else {
          copyFolder(fromPath, toPath)
        }
        const list = item;
        list.filterPath = req.body.targetPath;
        list.name = copyName;
        fileList.push(list);
      } else {
        replaceFileList.push(item.name);
      }
    });
    if (replaceFileList.length == 0) {
      copyName = "";
      let response = { files: fileList };
      response = JSON.stringify(response);
      res.setHeader('Content-Type', 'application/json');
      res.json(response);
    } else {
      isRenameChecking = false;
      let errorMsg = new Error();
      errorMsg.message = "File Already Exists.";
      errorMsg.code = "400";
      errorMsg.fileExists = replaceFileList;
      let response = { error: errorMsg, files: [] };
      response = JSON.stringify(response);
      res.setHeader('Content-Type', 'application/json');
      res.json(response);
    }
  }
}

const MoveFolder = (source, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
  }
  const files = fs.readdirSync(source);
  files.forEach(function (file) {
    const curSource = path.join(source, file);
    const curDest = path.join(dest, file);
    if (!fs.lstatSync(curSource).isDirectory()) {
      fs.copyFileSync(curSource, curDest, fs.constants.COPYFILE_EXCL, (err) => {
        if (err) throw err;
      });
      fs.unlinkSync(curSource, function (err) {
        if (err) throw err;
      });
    } else {
      MoveFolder(curSource, curDest);
      fs.rmdirSync(curSource);
    }
  });
}

/**
 * function move files and folder
 */
const MoveFiles = (req, res, contentRootPath) => {
  const fileList = [];
  const replaceFileList = [];
  let permissionDenied = false;
  const pathPermission = getPathPermission(false, req.body.targetData.name, contentRootPath + req.body.targetPath, contentRootPath, req.body.targetData.filterPath);

  req.body.data.forEach((item) => {
    const fromPath = contentRootPath + item.filterPath;
    const permission = getPermission(fromPath, item.name, item.isFile, contentRootPath, item.filterPath);
    const fileAccessDenied = permission != null && (!permission.read || !permission.write);
    const pathAccessDenied = pathPermission != null && (!pathPermission.read || !pathPermission.writeContents);

    if (fileAccessDenied || pathAccessDenied) {
      permissionDenied = true;
      const errorMsg = new Error();
      errorMsg.message = fileAccessDenied ? (permission.message !== "" ? permission.message :
        `${item.name} is not accessible. You need permission to perform the write action.`) :
        (pathPermission.message !== "" ? pathPermission.message :
          `${req.body.targetData.name} is not accessible. You need permission to perform the writeContents action.`);
      errorMsg.code = "401";
      const response = { error: errorMsg };
      res.setHeader('Content-Type', 'application/json');
      res.json(JSON.stringify(response));
    }
  });

  if (!permissionDenied) {
    req.body.data.forEach((item) => {
      const fromPath = contentRootPath + item.filterPath + item.name;
      let toPath = contentRootPath + req.body.targetPath + item.name;
      checkForFileUpdate(fromPath, toPath, item, contentRootPath, req);

      if (!isRenameChecking) {
        toPath = contentRootPath + req.body.targetPath + copyName;

        if (item.isFile) {
          const source = fs.createReadStream(path.join(fromPath));
          const desti = fs.createWriteStream(path.join(toPath));
          source.pipe(desti);
          source.on('end', () => {
            fs.unlinkSync(path.join(fromPath), (err) => {
              if (err) throw err;
            });
          });
        } else {
          MoveFolder(fromPath, toPath);
          fs.rmdirSync(fromPath);
        }

        const list = item;
        list.name = copyName;
        list.filterPath = req.body.targetPath;
        fileList.push(list);
      } else {
        replaceFileList.push(item.name);
      }
    });

    if (replaceFileList.length === 0) {
      copyName = "";
      const response = { files: fileList };
      res.setHeader('Content-Type', 'application/json');
      res.json(JSON.stringify(response));
    } else {
      isRenameChecking = false;
      const errorMsg = new Error();
      errorMsg.message = "File Already Exists.";
      errorMsg.code = "400";
      errorMsg.fileExists = replaceFileList;
      const response = { error: errorMsg, files: [] };
      res.setHeader('Content-Type', 'application/json');
      res.json(JSON.stringify(response));
    }
  }
}

const getRelativePath = (rootDirectory, fullPath) => {
  if (rootDirectory.endsWith("/")) {
    if (fullPath.includes(rootDirectory)) {
      return fullPath.substring(rootDirectory.length - 1);
    }
  } else if (fullPath.includes(rootDirectory + "/")) {
    return "/" + fullPath.substring(rootDirectory.length + 1);
  } else {
    return "";
  }
}

const hasPermission = rule => rule === undefined || rule === null || rule === permission.Allow;

const getMessage = rule => (rule.message === undefined || rule.message === null) ? "" : rule.message;

const updateRules = (filePermission, accessRule) => {
  filePermission.download = hasPermission(accessRule.read) && hasPermission(accessRule.download);
  filePermission.write = hasPermission(accessRule.read) && hasPermission(accessRule.write);
  filePermission.writeContents = hasPermission(accessRule.read) && hasPermission(accessRule.writeContents);
  filePermission.copy = hasPermission(accessRule.read) && hasPermission(accessRule.copy);
  filePermission.read = hasPermission(accessRule.read);
  filePermission.upload = hasPermission(accessRule.read) && hasPermission(accessRule.upload);
  filePermission.message = getMessage(accessRule);
  return filePermission;
};

const getPathPermission = (isFile, name, filepath, contentRootPath, filterPath) => getPermission(filepath, name, isFile, contentRootPath, filterPath);

const getPermission = (filepath, name, isFile, contentRootPath, filterPath) => {
  let filePermission = new AccessPermission(true, true, true, true, true, true, "");
  if (accessDetails == null) {
    return null;
  } else {
    accessDetails.rules.forEach(function (accessRule) {
      if (isFile && accessRule.isFile) {
        const nameExtension = name.substr(name.lastIndexOf("."), name.length - 1).toLowerCase();
        const fileName = name.substr(0, name.lastIndexOf("."));
        const currentPath = contentRootPath + filterPath;
        if (accessRule.isFile && isFile && accessRule.path != "" && accessRule.path != null && (accessRule.role == null || accessRule.role == accessDetails.role)) {
          if (accessRule.path.indexOf("*.*") > -1) {
            const parentPath = accessRule.path.substr(0, accessRule.path.indexOf("*.*"));
            if (currentPath.indexOf(contentRootPath + parentPath) == 0 || parentPath == "") {
              filePermission = updateRules(filePermission, accessRule);
            }
          }
          else if (accessRule.path.indexOf("*.") > -1) {
            const pathExtension = accessRule.path.substr(accessRule.path.lastIndexOf("."), accessRule.path.length - 1).toLowerCase();
            const parentPath = accessRule.path.substr(0, accessRule.path.indexOf("*."));
            if (((contentRootPath + parentPath) == currentPath || parentPath == "") && nameExtension == pathExtension) {
              filePermission = updateRules(filePermission, accessRule);
            }
          }
          else if (accessRule.path.indexOf(".*") > -1) {
            const pathName = accessRule.path.substr(0, accessRule.path.lastIndexOf(".")).substr(accessRule.path.lastIndexOf("/") + 1, accessRule.path.length - 1);
            const parentPath = accessRule.path.substr(0, accessRule.path.indexOf(pathName + ".*"));
            if (((contentRootPath + parentPath) == currentPath || parentPath == "") && fileName == pathName) {
              filePermission = updateRules(filePermission, accessRule);
            }
          }
          else if (contentRootPath + accessRule.path == filepath) {
            filePermission = updateRules(filePermission, accessRule);
          }
        }
      } else {
        if (!accessRule.isFile && !isFile && accessRule.path != null && (accessRule.role == null || accessRule.role == accessDetails.role)) {
          const parentFolderpath = contentRootPath + filterPath;
          if (accessRule.path.indexOf("*") > -1) {
            let parentPath = accessRule.path.substr(0, accessRule.path.indexOf("*"));
            if (((parentFolderpath + (parentFolderpath[parentFolderpath.length - 1] == "/" ? "" : "/") + name).lastIndexOf(contentRootPath + parentPath) == 0) || parentPath == "") {
              filePermission = updateRules(filePermission, accessRule);
            }
          } else if (path.join(contentRootPath, accessRule.path) == path.join(parentFolderpath, name) || path.join(contentRootPath, accessRule.path) == path.join(parentFolderpath, name + "/")) {
            filePermission = updateRules(filePermission, accessRule);
          }
          else if (path.join(parentFolderpath, name).lastIndexOf(path.join(contentRootPath, accessRule.path)) == 0) {
            filePermission.write = hasPermission(accessRule.writeContents);
            filePermission.writeContents = hasPermission(accessRule.writeContents);
            filePermission.message = getMessage(accessRule);
          }
        }
      }
    });
    return filePermission;
  }
}

/**
 * returns the current working directories
 */
const FileManagerDirectoryContent = async (req, res, filepath, searchFilterPath) => {
  const contentRootPath = GetContentRootPath(req, res);
  try {
    replaceRequestParams(req, res);
    const stats = await fs.promises.stat(filepath);
    let cwd;
    cwd = {
      name: path.basename(filepath),
      size: getSize(stats.size),
      isFile: stats.isFile(),
      dateModified: stats.ctime,
      dateCreated: stats.mtime,
      type: path.extname(filepath),
      filterPath: searchFilterPath || (req.body.data.length > 0 ? getRelativePath(contentRootPath, contentRootPath + req.body.path.substring(0, req.body.path.indexOf(req.body.data[0].name))) : ""),
      permission: getPathPermission(stats.isFile, (req.body.path == "/") ? "" : path.basename(filepath), filepath, contentRootPath, searchFilterPath),
      hasChild: false
    };

    if (stats.isDirectory()) {
      const files = await fs.promises.readdir(filepath);
      for (const file of files) {
        // check if file is a directory
        const isDirectory = fs.lstatSync(path.join(filepath, file)).isDirectory();
        if (isDirectory) {
          cwd.hasChild = true;
          break;
        }
      }
    }

    return cwd;
  } catch (error) {
    throw error;
  }
};

const replaceRequestParams = (req, res) => req.body.path = (req.body.path && req.body.path.replace(pattern, ""))
// ============================ End of Helper Methods ============================


// ============================ Controllers ============================
/**
 * Gets the imageUrl from the client
 */
export const GetImage = (req, res) => {
  const contentRootPath = GetContentRootPath(req, res);
  replaceRequestParams(req, res);
  const image = req.query.path.split("/").length > 1 ? req.query.path : "/" + req.query.path;
  const pathPermission = getPermission(contentRootPath + image.substr(0, image.lastIndexOf("/")), image.substr(image.lastIndexOf("/") + 1, image.length - 1), true, contentRootPath, image.substr(0, image.lastIndexOf("/")));
  if (pathPermission != null && !pathPermission.read) {
    return null;
  } else {
    fs.readFile(contentRootPath + image, function (err, content) {
      if (err) {
        res.writeHead(400, { 'Content-type': 'text/html' });
        res.end("No such image");
      } else {
        res.writeHead(200, { 'Content-type': 'image/jpg' });
        res.end(content);
      }
    });
  }
};

/**
 * Handles the upload request
 */
export const Upload = (req, res) => {
  const contentRootPath = GetContentRootPath(req, res);
  replaceRequestParams(req, res);
  const pathPermission = getPathPermission(true, JSON.parse(req.body.data).name, contentRootPath + req.body.path, contentRootPath, JSON.parse(req.body.data).filterPath);
  if (pathPermission != null && (!pathPermission.read || !pathPermission.upload)) {
    const errorMsg = new Error();
    errorMsg.message = (pathPermission.message !== "") ? pathPermission.message :
      JSON.parse(req.body.data).name + " is not accessible. You need permission to perform the upload action.";
    errorMsg.code = "401";
    const response = { error: errorMsg };
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
  } else {
    const fileName = req.files.map(file => file.originalname);
    const filePath = path.join(contentRootPath, req.body.path);
    for (let i = 0; i < fileName.length; i++) {
      // fs.rename('./' + fileName[i], path.join(filePath, fileName[i]), function (err) {
      //   if (err) throw err;
      // });
      fs.copyFileSync('./' + fileName[i], path.join(filePath, fileName[i]));
      fs.unlinkSync('./' + fileName[i]);
    }
    res.send('Success');
  }
};

/**
 * Download a file or folder
 */
export const Download = (req, res) => {
  const contentRootPath = GetContentRootPath(req, res);
  replaceRequestParams(req, res);
  const downloadObj = JSON.parse(req.body.downloadInput);
  let permissionDenied = false;
  downloadObj.data.forEach((item) => {
    const filepath = (contentRootPath + item.filterPath).replace(/\\/g, "/");
    const permission = getPermission(filepath + item.name, item.name, item.isFile, contentRootPath, item.filterPath);
    if (permission != null && (!permission.read || !permission.download)) {
      permissionDenied = true;
      const errorMsg = new Error();
      errorMsg.message = (permission.message !== "") ? permission.message : getFileName(contentRootPath + item.filterPath + item.name) + " is not accessible. You need permission to perform the download action.";
      errorMsg.code = "401";
      const response = { error: errorMsg };
      res.setHeader('Content-Type', 'application/json');
      res.json(response);
    }
  });
  if (!permissionDenied) {
    if (downloadObj.names.length === 1 && downloadObj.data[0].isFile) {
      const file = contentRootPath + downloadObj.path + downloadObj.names[0];
      res.download(file);
    } else {
      const archive = archiver('zip', {
        gzip: true,
        zlib: { level: 9 } // Sets the compression level.
      });
      const output = fs.createWriteStream('./Files.zip');
      downloadObj.data.forEach((item) => {
        archive.on('error', (err) => {
          throw err;
        });
        if (item.isFile) {
          archive.file(contentRootPath + item.filterPath + item.name, { name: item.name });
        } else {
          archive.directory(contentRootPath + item.filterPath + item.name + "/", item.name);
        }
      });
      archive.pipe(output);
      archive.finalize();
      output.on('close', () => {
        const stat = fs.statSync(output.path);
        res.writeHead(200, {
          'Content-disposition': 'attachment; filename=Files.zip; filename*=UTF-8',
          'Content-Type': 'APPLICATION/octet-stream',
          'Content-Length': stat.size
        });
        const filestream = fs.createReadStream(output.path);
        filestream.pipe(res);
      });
    }
  }
};

/**
 * Handles the read request
 */
export const Read = (req, res) => {
  const contentRootPath = GetContentRootPath(req, res);
  replaceRequestParams(req, res);
  req.setTimeout(0);
  function getRules() {
    const details = new AccessDetails();
    const accessRuleFile = "accessRules.json";
    if (!fs.existsSync(accessRuleFile)) { return null; }
    const rawData = fs.readFileSync(accessRuleFile);
    if (rawData.length === 0) { return null; }
    const parsedData = JSON.parse(rawData);
    const data = parsedData.rules;
    const accessRules = [];
    for (let i = 0; i < data.length; i++) {
      const rule = new AccessRules(data[i].path, data[i].role, data[i].read, data[i].write, data[i].writeContents, data[i].copy, data[i].download, data[i].upload, data[i].isFile, data[i].message);
      accessRules.push(rule);
    }
    if (accessRules.length == 1 && accessRules[0].path == undefined) {
      return null;
    } else {
      details.rules = accessRules;
      details.role = parsedData.role;
      return details;
    }
  }

  accessDetails = getRules();

  switch (req.body.action) {
    case "details":
      return getFileDetails(req, res, contentRootPath + req.body.path, req.body.data[0].filterPath);
    case "copy":
      return CopyFiles(req, res, contentRootPath);
    case "move":
      return MoveFiles(req, res, contentRootPath);
    case "create":
      return createFolder(req, res, contentRootPath + req.body.path, contentRootPath);
    case "delete":
      return deleteFolder(req, res, contentRootPath);
    case "rename":
      return renameFolder(req, res, contentRootPath + req.body.path);
    case "search":
      const fileList = [];
      const startPath = contentRootPath + req.body.path;
      const filter = req.body.searchString.replace(/\*/g, "");
      const caseSensitive = req.body.caseSensitive;
      const searchString = req.body.searchString;
      fromDir(startPath, filter, contentRootPath, caseSensitive, searchString, fileList);
      (async () => {
        const tes = await FileManagerDirectoryContent(req, res, contentRootPath + req.body.path);
        if (tes.permission != null && !tes.permission.read) {
          const errorMsg = new Error();
          errorMsg.message = (permission.message !== "") ? permission.message :
            "'" + getFileName(contentRootPath + (req.body.path.substring(0, req.body.path.length - 1))) + "' is not accessible. You need permission to perform the read action.";
          errorMsg.code = "401";
          let response = { error: errorMsg };
          response = JSON.stringify(response);
          res.setHeader('Content-Type', 'application/json');
          res.json(response);
        } else {
          let response = { cwd: tes, files: fileList };
          response = JSON.stringify(response);
          res.setHeader('Content-Type', 'application/json');
          res.json(response);
        }
      })();
      break;
    case "read":
      (async () => {
        const filesList = await GetFiles(req, res);
        const cwdFiles = await FileManagerDirectoryContent(req, res, contentRootPath + req.body.path);
        cwdFiles.name = req.body.path == "/" ? rootName = (path.basename(contentRootPath + req.body.path)) : path.basename(contentRootPath + req.body.path)
        let response = {};
        if (cwdFiles.permission != null && !cwdFiles.permission.read) {
          const errorMsg = new Error();
          errorMsg.message = (cwdFiles.permission.message !== "") ? cwdFiles.permission.message :
            "'" + cwdFiles.name + "' is not accessible. You need permission to perform the read action.";
          errorMsg.code = "401";
          let response = { cwd: cwdFiles, files: null, error: errorMsg };
          response = JSON.stringify(response);
          res.setHeader('Content-Type', 'application/json');
          res.json(response);
        }
        else {
          ReadDirectories(filesList).then(data => {
            let response = { cwd: cwdFiles, files: data };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
          });
        }
      })();
      break;
    default:
      console.log("Invalid action");
      break;
  }

  function addSearchList(filename, contentRootPath, fileList, files, index) {
    const cwd = {};
    const stats = fs.statSync(filename);
    cwd.name = path.basename(filename);
    cwd.size = stats.size;
    cwd.isFile = stats.isFile();
    cwd.dateModified = stats.mtime;
    cwd.dateCreated = stats.ctime;
    cwd.type = path.extname(filename);
    cwd.filterPath = filename.substr(contentRootPath.length, filename.length).replace(files[index], "");
    cwd.permission = getPermission(filename.replace(/\\/g, "/"), cwd.name, cwd.isFile, contentRootPath, cwd.filterPath);
    const permission = parentsHavePermission(filename, contentRootPath, cwd.isFile, cwd.name, cwd.filterPath);
    if (permission) {
      if (fs.lstatSync(filename).isFile()) {
        cwd.hasChild = false;
      }
      if (fs.lstatSync(filename).isDirectory()) {
        const statsRead = fs.readdirSync(filename);
        cwd.hasChild = statsRead.length > 0;
      }
      fileList.push(cwd);
    }
  }

  function parentsHavePermission(filepath, contentRootPath, isFile, name, filterPath) {
    const parentPath = filepath.substr(contentRootPath.length, filepath.length - 1).replace(/\\/g, "/");
    const parents = parentPath.split('/');
    let currPath = "/";
    let hasPermission = true;
    let pathPermission;
    for (let i = 0; i <= parents.length - 2; i++) {
      currPath = (parents[i] == "") ? currPath : (currPath + parents[i] + "/");
      pathPermission = getPathPermission(false, parents[i], contentRootPath + (currPath == "/" ? "" : "/"), contentRootPath, filterPath);
      if (pathPermission == null) {
        break;
      }
      else if (pathPermission != null && !pathPermission.read) {
        hasPermission = false;
        break;
      }
    }
    return hasPermission;
  }

  function checkForSearchResult(casesensitive, filter, isFile, fileName, searchString) {
    let isAddable = false;
    if (searchString.substr(0, 1) == "*" && searchString.substr(searchString.length - 1, 1) == "*") {
      if (casesensitive ? fileName.indexOf(filter) >= 0 : (fileName.indexOf(filter.toLowerCase()) >= 0 || fileName.indexOf(filter.toUpperCase()) >= 0)) {
        isAddable = true
      }
    } else if (searchString.substr(searchString.length - 1, 1) == "*") {
      if (casesensitive ? fileName.startsWith(filter) : (fileName.startsWith(filter.toLowerCase()) || fileName.startsWith(filter.toUpperCase()))) {
        isAddable = true
      }
    } else {
      if (casesensitive ? fileName.endsWith(filter) : (fileName.endsWith(filter.toLowerCase()) || fileName.endsWith(filter.toUpperCase()))) {
        isAddable = true
      }
    }
    return isAddable;
  }

  function fromDir(startPath, filter, contentRootPath, casesensitive, searchString, fileList) {
    if (!fs.existsSync(startPath)) {
      return;
    }
    const files = fs.readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
      const filename = path.join(startPath, files[i]);
      const stat = fs.lstatSync(filename);
      if (stat.isDirectory()) {
        if (checkForSearchResult(casesensitive, filter, false, files[i], searchString)) {
          addSearchList(filename, contentRootPath, fileList, files, i);
        }
        fromDir(filename, filter, contentRootPath, casesensitive, searchString, fileList); //recurse
      }
      else if (checkForSearchResult(casesensitive, filter, true, files[i], searchString)) {
        addSearchList(filename, contentRootPath, fileList, files, i);
      }
    }
  }

  function ReadDirectories(file) {
    const contentRootPath = GetContentRootPath(req, res);
    const cwd = {};
    let directoryList = [];
    function stats(file) {
      return new Promise((resolve, reject) => {
        fs.stat(file, (err, cwd) => {
          if (err) {
            return reject(err);
          }
          cwd.name = path.basename(contentRootPath + req.body.path + file);
          cwd.size = (cwd.size);
          cwd.isFile = cwd.isFile();
          cwd.dateModified = cwd.ctime;
          cwd.dateCreated = cwd.mtime;
          cwd.filterPath = getRelativePath(contentRootPath, contentRootPath + req.body.path, req);
          cwd.type = path.extname(contentRootPath + req.body.path + file);
          cwd.permission = getPermission(contentRootPath + req.body.path + cwd.name, cwd.name, cwd.isFile, contentRootPath, cwd.filterPath);
          if (fs.lstatSync(file).isDirectory()) {
            fs.readdirSync(file).forEach(async function (items) {
              const isDirectory = await fs.lstatSync(path.join(file, items)).isDirectory();
              if (isDirectory) {
                // push each child into directoryList
                directoryList.push(items);
              }
              if (directoryList.length > 0) {
                cwd.hasChild = true;
              } else {
                cwd.hasChild = false;
                directoryList = [];
              }
            });
          } else {
            cwd.hasChild = false;
            let dir = [];
          }
          directoryList = [];
          resolve(cwd);
        });
      });
    }
    const promiseList = [];
    for (let i = 0; i < file.length; i++) {
      promiseList.push(stats(path.join(contentRootPath + req.body.path.replace(pattern, ""), file[i])));
    }
    return Promise.all(promiseList);
  }
};