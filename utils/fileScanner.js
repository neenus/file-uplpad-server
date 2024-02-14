import NodeClam from 'clamscan';

export const scanFiles = async files => {
  const clamscan = await new NodeClam().init({
    clamdscan: {
      socket: '/var/run/clamav/clamd.ctl',
      local_fallback: true,
      path: '/usr/bin/clamdscan',
      config_file: '/etc/clamav/clamd.conf',
    },
    remove_infected: true, // Removes infected files
    quarantine_infected: './quarantine', // Move file here. remove_infected must be TRUE
    scan_log: '/var/log/clamav/clamscan.log', // You're a detail-oriented security professional. You'll enable this, right?
    debug_mode: true, // This will put some debug info in your js console
    preference: 'clamdscan', // If set to 'clamdscan', it will use the clamdscan binary instead of freshclam
  });


  let infectedFiles = [];
  const version = await clamscan.getVersion();
  console.log(`ClamAV Version: ${version}`);

  // check if files is an array for multiple files, otherwise scan the single file
  if (!Array.isArray(files)) {
    const { isInfected, file: infectedFile } = await clamscan.isInfected(files.tempFilePath);
    if (isInfected) {
      infectedFiles.push(infectedFile);
    }
  } else {
    for (let file of files) {
      const { isInfected, file: infectedFile } = await clamscan.isInfected(file.tempFilePath);
      if (isInfected) {
        infectedFiles.push(infectedFile);
      }
    }
  }

  return infectedFiles;
}

// export default scanFiles;
export default scanFiles;
