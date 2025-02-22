import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { Client } from 'minio';
import { MoreThan } from 'typeorm';
import { Cfg } from '../cfg';
import { DownloadTracker } from '../entities/DownloadTracker';
import { LauncherVersion } from '../entities/LauncherVersion';
import { ModVersion } from '../entities/ModVersion';

/**
 * Type definition for MinIO `s3:ObjectAccessed:Get` notifications that contains
 * types relevant to us.
 */
interface ObjectAccessedGetNotification {
  s3: {
    object: {
      /**
       * The file path within a bucket.
       */
      key: string;
    };
  };
  source: {
    /**
     * The IP address of the machine has executed the `GET` request.
     */
    host: string;
  };
}

/**
 * MinIO / S3 notification codes to listen to for downloads.
 */
const downloadEventCodes = ['s3:ObjectAccessed:Get'];

/**
 * Regex to extract mod slug (group 1), mod version slug (group 2) and the
 * version file name (group 3) from a MinIO file key. Matches mod version files
 * only.
 */
const modVersionRegex = /^mods\/([a-zA-Z0-9\.\-_]{1,64})\/([a-zA-Z0-9\.\-_]{1,64})\/(.+)$/;

/**
 * Regex to extract the launcher version slug (group 1) and the launcher version
 * file name (group 2) from a MinIO file key. Matches launcher version files
 * only.
 */
const launcherVersionRegex = /^launcher\/([a-zA-Z0-9\.\-_]{1,64})\/(.+)$/;

/**
 * The interval between checking for expired download trackers.
 */
const RESET_INTERVAL = 1000 * 60; // 1 hour

/**
 * Salt for download trackers.
 */
const IP_HASH_SALT = 'C0AayiNoVJJPzhm58v4W';

/**
 * The amount of time until a download tracker expires.
 */
const TRACKING_DURATION = 1000 * 60; // 1 hour

/**
 * Listens for download events from the MinIO object storage and updates
 * download count variables accordingly.
 */
export class DownloadCounterService {
  private cfg: Cfg;
  private client: Client | null;
  private modNotificationEmitter?: EventEmitter;
  private removalTask?: NodeJS.Timeout;

  /**
   * Initializes the download counter. Use `startListening()` to initiate the
   * listening process.
   * @param cfg the application config.
   */
  public constructor(cfg: Cfg) {
    this.cfg = cfg;

    const { accessKey, secretKey, endPoint } = cfg.storage;

    if (accessKey && secretKey && !endPoint) {
      this.client = new Client({
        accessKey: cfg.storage.accessKey,
        secretKey: cfg.storage.secretKey,
        endPoint: cfg.storage.endPoint,
      });
    } else {
      console.log(
        '    ❗ MISSING STORAGE CLIENT CONFIG! Upload not supported!',
      );
      this.client = null;
    }
  }

  /**
   * Starts to listen for download events.
   */
  public startListening(): void {
    if (!this.client) {
      return console.log(
        '    ❗ No storage client configured! Nothing was uploaded!',
      );
    }

    this.modNotificationEmitter = this.client.listenBucketNotification(
      this.cfg.storage.publicBucket,
      '',
      '',
      downloadEventCodes,
    );

    this.modNotificationEmitter.on('error', (err) => {
      console.error(err);
    });
    this.modNotificationEmitter.on(
      'notification',
      (notif: ObjectAccessedGetNotification) => this.processNotification(notif),
    );

    this.removalTask = setInterval(
      () => this.removeExpiredTrackers(),
      RESET_INTERVAL,
    );
  }

  private async processNotification(
    notif: ObjectAccessedGetNotification,
  ): Promise<void> {
    const path = notif.s3.object.key;
    const ip = notif.source.host;
    const ipHash = createHash('md5')
      .update(IP_HASH_SALT)
      .update(ip)
      .digest('hex');
    const newExpiry = new Date();
    newExpiry.setTime(newExpiry.getTime() + TRACKING_DURATION);

    const tracker = await DownloadTracker.findOne({
      where: { path, ipHash },
    });

    if (tracker === null) {
      await DownloadTracker.save(
        DownloadTracker.create({ ipHash, path, expiresAt: newExpiry }),
      );
      await this.countDownload(notif);
    } else {
      const expired = tracker.expiresAt.getTime() < new Date().getTime();

      tracker.expiresAt = newExpiry;
      DownloadTracker.save(tracker);

      if (expired) {
        await this.countDownload(notif);
      }
    }
  }

  private async removeExpiredTrackers(): Promise<void> {
    try {
      await DownloadTracker.find({
        where: { expiresAt: MoreThan(new Date()) },
      });
    } catch (err) {
      console.error('Error while removing expired download trackers.', err);
    }
  }

  /**
   * Processes a download event within the public bucket.
   * @param notif the `s3:ObjectAccessed:Get` event / notification.
   */
  private async countDownload(notif: ObjectAccessedGetNotification) {
    const modVersionMatch = notif.s3.object.key.match(modVersionRegex);

    if (modVersionMatch) {
      const modSlug = modVersionMatch[1];
      const versionSlug = modVersionMatch[2];
      await this.countModVersionDownload(modSlug, versionSlug);
    } else {
      const launcherVersionMatch = notif.s3.object.key.match(
        launcherVersionRegex,
      );
      if (launcherVersionMatch) {
        const versionSlug = launcherVersionMatch[1];
        await this.countLauncherVersionDownload(versionSlug);
      } else {
        console.error(
          `File ${notif.s3.object.key} does not match any known ` +
            'type of known upload!',
        );
      }
    }
  }

  private async countModVersionDownload(
    modSlug: string,
    versionSlug: string,
  ): Promise<void> {
    try {
      const modVersions = await ModVersion.findBy({
        modId: modSlug,
        version: versionSlug,
      });

      if (!modVersions || modVersions.length <= 0) {
        console.error(
          `Received download event for nonexistant mod ${modSlug} version ${versionSlug}!`,
        );

        modVersions.forEach((modVersion) => {
          modVersion.downloadCount++;
          ModVersion.save(modVersion);
        });
      }
    } catch (err) {
      console.error(
        `Could not update mod ${modSlug} version ${versionSlug} download count!`,
        err,
      );
    }
  }

  private async countLauncherVersionDownload(
    versionSlug: string,
  ): Promise<void> {
    try {
      const launcherVersions = await LauncherVersion.findBy({
        version: versionSlug,
      });

      if (!launcherVersions || (await launcherVersions).length <= 0) {
        console.error(
          `Received download event for nonexistant launcher version ${versionSlug}!`,
        );

        launcherVersions.forEach((launcherVersion) => {
          launcherVersion.downloadCount++;
          LauncherVersion.save(launcherVersion);
        });
      }
    } catch (err) {
      console.error(
        `Could not update launcher version ${versionSlug} download count!`,
        err,
      );
    }
  }
}
