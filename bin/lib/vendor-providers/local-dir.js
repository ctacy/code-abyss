'use strict';

function getSourcePath(projectRoot, upstream, shared) {
  return shared.resolveUpstreamPath(projectRoot, upstream.path);
}

module.exports = {
  name: 'local-dir',
  validate(upstream) {
    if (!upstream.path) {
      throw new Error('upstream.provider=local-dir 时必须提供 path');
    }
  },
  sync({ projectRoot, upstream, vendorDir, shared, packName }) {
    const sourcePath = getSourcePath(projectRoot, upstream, shared);
    if (!shared.fs.existsSync(sourcePath) || !shared.fs.statSync(sourcePath).isDirectory()) {
      throw new Error(`local-dir source 不存在或不是目录: ${sourcePath}`);
    }

    const action = shared.fs.existsSync(vendorDir) ? 'updated' : 'cloned';
    shared.rmSafe(vendorDir);
    shared.copyRecursive(sourcePath, vendorDir);
    shared.writeVendorMetadata(vendorDir, {
      pack: packName,
      provider: 'local-dir',
      path: upstream.path,
      version: upstream.version || '',
      sourceSignature: shared.hashDirectory(sourcePath),
      vendorSignature: shared.hashDirectory(vendorDir),
    });
    return {
      pack: packName,
      provider: 'local-dir',
      action,
      vendorDir,
      path: upstream.path,
      version: upstream.version || '',
    };
  },
  status({ projectRoot, upstream, vendorDir, shared, packName, metadata }) {
    const sourcePath = getSourcePath(projectRoot, upstream, shared);
    const sourceExists = shared.fs.existsSync(sourcePath) && shared.fs.statSync(sourcePath).isDirectory();
    const vendorSignature = shared.hashDirectory(vendorDir);
    const sourceSignature = sourceExists ? shared.hashDirectory(sourcePath) : null;
    return {
      pack: packName,
      provider: 'local-dir',
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
