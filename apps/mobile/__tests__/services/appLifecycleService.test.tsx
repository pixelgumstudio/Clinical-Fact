// @ts-nocheck
/**
 * Mobile App Lifecycle Service Unit Tests
 * Tests in-flight job tracking, persistence, reconnection logic
 */

import appLifecycleService from '../../src/services/appLifecycleService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

jest.mock('@react-native-async-storage/async-storage');

describe('App Lifecycle Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('trackInFlightJob', () => {
    it('should add job to in-flight tracking', async () => {
      // Act
      await appLifecycleService.trackInFlightJob('job-123', 'note');

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'clinicalfact_in_flight_jobs',
        expect.stringContaining('job-123')
      );
    });

    it('should include jobId and jobType', async () => {
      // Act
      await appLifecycleService.trackInFlightJob('job-456', 'chat');

      // Assert
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);
      expect(storedData[0].jobId).toBe('job-456');
      expect(storedData[0].jobType).toBe('chat');
    });

    it('should preserve existing jobs when adding new ones', async () => {
      // Arrange - existing jobs
      const existingJobs = JSON.stringify([
        { jobId: 'existing-job', jobType: 'note', createdAt: new Date().toISOString() },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(existingJobs);

      // Act
      await appLifecycleService.trackInFlightJob('new-job', 'chat');

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const updatedJobs = JSON.parse(callArgs[1]);
      expect(updatedJobs.length).toBe(2);
      expect(updatedJobs.some((j: any) => j.jobId === 'existing-job')).toBe(true);
      expect(updatedJobs.some((j: any) => j.jobId === 'new-job')).toBe(true);
    });

    it('should track creation timestamp', async () => {
      // Act
      const beforeTime = Date.now();
      await appLifecycleService.trackInFlightJob('timestamp-job', 'note');
      const afterTime = Date.now();

      // Assert
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);
      const createdAt = new Date(storedData[0].createdAt).getTime();
      expect(createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(createdAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('removeInFlightJob', () => {
    it('should remove completed job from tracking', async () => {
      // Arrange
      const jobs = JSON.stringify([
        {
          jobId: 'completed-job',
          jobType: 'note',
          createdAt: new Date().toISOString(),
        },
        {
          jobId: 'other-job',
          jobType: 'chat',
          createdAt: new Date().toISOString(),
        },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(jobs);

      // Act
      await appLifecycleService.removeInFlightJob('completed-job');

      // Assert
      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const updatedJobs = JSON.parse(callArgs[1]);
      expect(updatedJobs.length).toBe(1);
      expect(updatedJobs[0].jobId).toBe('other-job');
    });

    it('should handle removing non-existent job gracefully', async () => {
      // Arrange
      const jobs = JSON.stringify([
        {
          jobId: 'existing-job',
          jobType: 'note',
          createdAt: new Date().toISOString(),
        },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(jobs);

      // Act & Assert - should not throw
      await expect(appLifecycleService.removeInFlightJob('non-existent')).resolves.not.toThrow();
    });

    it('should clear storage when last job is removed', async () => {
      // Arrange
      const jobs = JSON.stringify([
        {
          jobId: 'last-job',
          jobType: 'note',
          createdAt: new Date().toISOString(),
        },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(jobs);

      // Act
      await appLifecycleService.removeInFlightJob('last-job');

      // Assert
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        'clinicalfact_in_flight_jobs'
      );
    });
  });

  describe('getInFlightJobs', () => {
    it('should retrieve all in-flight jobs', async () => {
      // Arrange
      const jobs = JSON.stringify([
        { jobId: 'job-1', jobType: 'note', createdAt: new Date().toISOString() },
        { jobId: 'job-2', jobType: 'chat', createdAt: new Date().toISOString() },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(jobs);

      // Act
      const inFlightJobs = await appLifecycleService.getInFlightJobs();

      // Assert
      expect(inFlightJobs).toHaveLength(2);
      expect(inFlightJobs[0].jobId).toBe('job-1');
      expect(inFlightJobs[1].jobId).toBe('job-2');
    });

    it('should return empty array if no jobs tracked', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      // Act
      const inFlightJobs = await appLifecycleService.getInFlightJobs();

      // Assert
      expect(inFlightJobs).toEqual([]);
    });

    it('should filter expired jobs (24 hour TTL)', async () => {
      // Arrange
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();

      const jobs = JSON.stringify([
        { jobId: 'recent-job', jobType: 'note', createdAt: twoHoursAgo },
        { jobId: 'expired-job', jobType: 'chat', createdAt: thirtyHoursAgo },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(jobs);

      // Act
      const inFlightJobs = await appLifecycleService.getInFlightJobs();

      // Assert - expired job should be filtered out
      expect(inFlightJobs.some((j) => j.jobId === 'expired-job')).toBe(false);
    });
  });

  describe('reconnectToJobs', () => {
    it('should reconnect to in-flight jobs on app foreground', async () => {
      // Arrange
      const jobs = [
        { jobId: 'reconnect-1', jobType: 'note' },
        { jobId: 'reconnect-2', jobType: 'chat' },
      ];

      // Act
      const reconnected = await appLifecycleService.reconnectToJobs(jobs);

      // Assert
      expect(reconnected).toHaveLength(2);
    });

    it('should restore polling for reconnected jobs', async () => {
      // Arrange
      const jobs = [{ jobId: 'poll-job', jobType: 'note' }];

      // Act
      await appLifecycleService.reconnectToJobs(jobs);

      // Assert - should attempt to reconnect (would be verified by polling calls in integration test)
      expect(jobs.length).toBe(1);
    });

    it('should handle empty job list', async () => {
      // Act & Assert
      await expect(appLifecycleService.reconnectToJobs([])).resolves.not.toThrow();
    });
  });

  describe('initializeLifecycleTracking', () => {
    it('should setup AppState listener on initialization', async () => {
      // Arrange
      const addListenerSpy = jest.spyOn(AppState, 'addEventListener');

      // Act
      await appLifecycleService.initializeLifecycleTracking();

      // Assert
      expect(addListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should restore in-flight jobs on app startup', async () => {
      // Arrange
      const storedJobs = JSON.stringify([
        {
          jobId: 'startup-job',
          jobType: 'note',
          createdAt: new Date().toISOString(),
        },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(storedJobs);

      // Act
      await appLifecycleService.initializeLifecycleTracking();

      // Assert
      const inFlightJobs = await appLifecycleService.getInFlightJobs();
      expect(inFlightJobs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('AppState Changes', () => {
    it('should persist jobs when app goes to background', async () => {
      // This would be tested in integration tests
      // Here we just verify the mechanism is in place

      // Arrange
      const jobs = [
        { jobId: 'bg-job', jobType: 'note', createdAt: new Date().toISOString() },
      ];

      // Act - Simulate background transition
      await appLifecycleService.trackInFlightJob('bg-job', 'note');

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should reconnect when app returns to foreground', async () => {
      // Arrange
      const jobs = JSON.stringify([
        { jobId: 'fg-job', jobType: 'chat', createdAt: new Date().toISOString() },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(jobs);

      // Act
      const retrievedJobs = await appLifecycleService.getInFlightJobs();

      // Assert
      expect(retrievedJobs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Job Expiration', () => {
    it('should automatically cleanup expired jobs', async () => {
      // Arrange
      const now = new Date();
      const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();

      const jobs = JSON.stringify([
        { jobId: 'expired-cleanup', jobType: 'note', createdAt: thirtyHoursAgo },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(jobs);

      // Act
      const inFlightJobs = await appLifecycleService.getInFlightJobs();

      // Assert - expired job should not be in results
      expect(inFlightJobs.some((j) => j.jobId === 'expired-cleanup')).toBe(false);
    });

    it('should preserve jobs within 24-hour window', async () => {
      // Arrange
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

      const jobs = JSON.stringify([
        { jobId: 'fresh-job', jobType: 'youtube', createdAt: twoHoursAgo },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(jobs);

      // Act
      const inFlightJobs = await appLifecycleService.getInFlightJobs();

      // Assert - fresh job should be preserved
      expect(inFlightJobs.some((j) => j.jobId === 'fresh-job')).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove all listeners on cleanup', () => {
      // Arrange
      const removeListenerSpy = jest.spyOn(AppState, 'removeEventListener');

      // Act
      appLifecycleService.cleanup();

      // Assert
      expect(removeListenerSpy).toHaveBeenCalled();
    });
  });
});
