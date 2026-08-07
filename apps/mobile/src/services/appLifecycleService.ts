import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InFlightJob {
  jobId: string;
  jobType: 'youtube' | 'audio' | 'pdf' | 'note' | 'chat';
  createdAt: number;
}

class AppLifecycleService {
  private appStateSubscription: any = null;
  private inFlightJobs: Map<string, InFlightJob> = new Map();

  async initializeLifecycleTracking(): Promise<void> {
    try {
      // Load in-flight jobs from storage
      const stored = await AsyncStorage.getItem('inFlightJobs');
      if (stored) {
        const jobs = JSON.parse(stored);
        jobs.forEach((job: InFlightJob) => {
          this.inFlightJobs.set(job.jobId, job);
        });
      }

      // Listen for app state changes
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange.bind(this)
      );
    } catch (error) {
      console.error('Error initializing app lifecycle tracking:', error);
    }
  }

  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    if (nextAppState === 'active') {
      console.log('App has come to foreground');
      await this.reconnectToJobs();
    } else if (nextAppState === 'background') {
      console.log('App has gone to background');
      await this.persistJobs();
    }
  }

  async trackInFlightJob(jobId: string, jobType: InFlightJob['jobType']): Promise<void> {
    try {
      const job: InFlightJob = {
        jobId,
        jobType,
        createdAt: Date.now(),
      };
      this.inFlightJobs.set(jobId, job);
      await this.persistJobs();
      console.log(`Tracked job ${jobId} (${jobType})`);
    } catch (error) {
      console.error('Error tracking in-flight job:', error);
    }
  }

  async removeInFlightJob(jobId: string): Promise<void> {
    try {
      this.inFlightJobs.delete(jobId);
      await this.persistJobs();
      console.log(`Removed job ${jobId} from tracking`);
    } catch (error) {
      console.error('Error removing in-flight job:', error);
    }
  }

  async getInFlightJobs(): Promise<InFlightJob[]> {
    return Array.from(this.inFlightJobs.values());
  }

  private async persistJobs(): Promise<void> {
    try {
      const jobs = Array.from(this.inFlightJobs.values());
      await AsyncStorage.setItem('inFlightJobs', JSON.stringify(jobs));
    } catch (error) {
      console.error('Error persisting jobs:', error);
    }
  }

  private async reconnectToJobs(): Promise<void> {
    try {
      const jobs = await this.getInFlightJobs();
      if (jobs.length > 0) {
        console.log(`Reconnecting to ${jobs.length} in-flight job(s)`);
        // Reconnection logic would happen here
        // (e.g., resume SSE streams, start polling)
      }
    } catch (error) {
      console.error('Error reconnecting to jobs:', error);
    }
  }

  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export default new AppLifecycleService();
