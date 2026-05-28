'use strict';

function getArchivePath(projectRoot, upstream, shared) {
  return shared.resolveUpstreamPath(projectRoot, upstream.path);
}

module.exports = {
  name: 'archive',
  validate(upstream) {
    if (!upstream.path) {
      throw new Error('upstream.provider=archive 时必须提供 path');
    }
  },
  sync({ projectRoot, upstream, vendorDir, shared, packName }) {
    const archivePath = getArchivePath(projectRoot, upstream, shared);
    if (!shared.fs.existsSync(archivePath) || !shared.fs.statSync(archivePath).isFile()) {
      throw new Error(`archive source 不存在或不是文件: ${archivePath}`);
    }

    const action = shared.fs.existsSync(vendorDir) ? 'updated' : 'cloned';
    shared.rmSafe(vendorDir);
    shared.fs.mkdirSync(vendorDir, { recursive: true });
    shared.extractArchive(archivePath, vendorDir);
    shared.writeVendorMetadata(vendorDir, {
      pack: packName,
      provider: 'archive',
      path: upstream.path,
      version: upstream.version || '',
      sourceSignature: shared.hashFile(archivePath),
      vendorSignature: shared.hashDirectory(vendorDir),
    });
    return {
      pack: packName,
      provider: 'archive',
      action,
      vendorDir,
      path: upstream.path,
      version: upstream.version || '',
    };
  },
  status({ projectRoot, upstream, vendorDir, shared, packName, metadata }) {
    const archivePath = getArchivePath(projectRoot, upstream, shared);
    const sourceExists = shared.fs.existsSync(archivePath) && shared.fs.statSync(archivePath).isFile();
    const vendorSignature = shared.hashDirectory(vendorDir);
    const sourceSignature = sourceExists ? shared.hashFile(archivePath) : null;
    return {
      pack: packName,
      provider: 'archive',
      vendorDir,
      exists: true,
      dirty: metadata && metadata.vendorSignature ? vendorSignature !== metadata.vendorSignature : true,
      drifted: metadata && metadata.sourceSignature ? sourceSignature !== metadata.sourceSignature : true,
      currentCommit: null,
      targetCommit: null,
      sourceExists,
      metadata,
    };
  },
};
