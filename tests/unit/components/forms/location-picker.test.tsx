import type { ReactElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { CreateTripForm } from '@/components/forms/create-trip-form';
import { CreateVisitedPlaceForm } from '@/components/forms/create-visited-place-form';
import { LocationPicker } from '@/components/forms/location-picker';

const mutationMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('@/app/actions/planning-actions', () => ({
  createTripAction: vi.fn(),
  createVisitedPlaceAction: vi.fn(),
}));

vi.mock('@/hooks/useI18n', () => ({
  useI18n: (namespace?: string) => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'actions.trip.created': 'Trip created',
        'actions.visitedPlace.created': 'Visited place created',
        'common.working': 'Working',
        'forms.locationSearch.noResults': 'No places found.',
        'forms.locationSearch.rateLimited': 'Place search is cooling down.',
        'forms.locationSearch.submit': 'Search',
        'forms.locationSearch.unavailable': 'Place search is unavailable.',
        'forms.trip.endDateDescription': 'End date',
        'forms.trip.endDateLabel': 'End date',
        'forms.trip.locationDescription': 'Optional trip place.',
        'forms.trip.locationLabel': 'Location',
        'forms.trip.locationPlaceholder': 'Da Nang',
        'forms.trip.locationSearching': 'Searching places',
        'forms.trip.noteDescription': 'Note',
        'forms.trip.noteLabel': 'Note',
        'forms.trip.notePlaceholder': 'Note',
        'forms.trip.startDateDescription': 'Start date',
        'forms.trip.startDateLabel': 'Start date',
        'forms.trip.submit': 'Create trip',
        'forms.trip.titleLabel': 'Trip title',
        'forms.trip.titlePlaceholder': 'Trip title',
        'forms.trip.validation.dateRangeInvalid': 'End date must not be before start date.',
        'forms.trip.validation.endDateRequired': 'End date is required.',
        'forms.trip.validation.noteMax': 'Note is too long.',
        'forms.trip.validation.startDateRequired': 'Start date is required.',
        'forms.trip.validation.titleMax': 'Title is too long.',
        'forms.trip.validation.titleRequired': 'Title is required.',
        'forms.visitedPlace.locationDescription': 'Optional stop place.',
        'forms.visitedPlace.locationLabel': 'Location',
        'forms.visitedPlace.locationPlaceholder': 'Hoi An',
        'forms.visitedPlace.locationSearching': 'Searching places',
        'forms.visitedPlace.noteDescription': 'Note',
        'forms.visitedPlace.noteLabel': 'Note',
        'forms.visitedPlace.notePlaceholder': 'Note',
        'forms.visitedPlace.submit': 'Add stop',
        'forms.visitedPlace.titleLabel': 'Place title',
        'forms.visitedPlace.titlePlaceholder': 'Place title',
        'forms.visitedPlace.validation.noteMax': 'Note is too long.',
        'forms.visitedPlace.validation.titleMax': 'Title is too long.',
        'forms.visitedPlace.validation.titleRequired': 'Title is required.',
        'forms.visitedPlace.validation.visitedOnRange': 'Date is outside the trip.',
        'forms.visitedPlace.validation.visitedOnRequired': 'Date is required.',
      };

      return translations[namespace ? `${namespace}.${key}` : key] ?? key;
    },
  }),
}));

vi.mock('@/lib/query/action-mutation', () => ({
  getActionErrorMessage: () => 'unexpectedError',
  useActionMutation: () => ({
    isPending: false,
    mutateAsync: mutationMocks.mutateAsync,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const createJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  });

const nominatimLocations = [
  {
    address: 'Hoi An, Quang Nam, Vietnam',
    latitude: 15.8801,
    longitude: 108.338,
    name: 'Hoi An',
    provider: 'nominatim',
    providerId: 'relation:12345',
  },
] as const;

const renderWithQueryClient = (ui: ReactElement): void => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const getFormData = (form: HTMLFormElement): FormData => new FormData(form);

describe('LocationPicker', () => {
  beforeEach(() => {
    mutationMocks.mutateAsync.mockReset();
    mutationMocks.mutateAsync.mockResolvedValue({
      message: 'trip.created',
      status: 'success',
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('does not search while the user is typing', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    render(
      <LocationPicker
        placeholder="Search place"
        searchingLabel="Searching places"
      />,
    );

    await user.type(screen.getByRole('textbox'), 'Hoi An');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('searches on button click and writes selected Nominatim hidden fields', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(createJsonResponse({ locations: nominatimLocations }));
    render(
      <form data-testid="location-form">
        <LocationPicker
          placeholder="Search place"
          searchingLabel="Searching places"
        />
      </form>,
    );

    await user.type(screen.getByRole('textbox'), 'Hoi An');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: /Hoi An/ }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/geo/search?q=Hoi%20An', expect.any(Object));
    const form = screen.getByTestId('location-form') as HTMLFormElement;
    const formData = getFormData(form);
    expect(formData.get('locationName')).toBe('Hoi An');
    expect(formData.get('locationAddress')).toBe('Hoi An, Quang Nam, Vietnam');
    expect(formData.get('locationLatitude')).toBe('15.8801');
    expect(formData.get('locationLongitude')).toBe('108.338');
    expect(formData.get('locationProvider')).toBe('nominatim');
    expect(formData.get('locationProviderId')).toBe('relation:12345');
  });

  test('searches on Enter as an explicit submit action', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(createJsonResponse({ locations: [] }));
    render(
      <LocationPicker
        placeholder="Search place"
        searchingLabel="Searching places"
      />,
    );

    await user.type(screen.getByRole('textbox'), 'Da Nang{Enter}');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/geo/search?q=Da%20Nang', expect.any(Object));
  });

  test('shows safe fallback text for rate limits and provider failures', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ error: 'rate_limited', locations: [] }, 429),
    );
    render(
      <LocationPicker
        placeholder="Search place"
        searchingLabel="Searching places"
      />,
    );

    await user.type(screen.getByRole('textbox'), 'Hue');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Place search is cooling down.')).toBeDefined();

    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ error: 'geo_provider_unavailable', locations: [] }, 503),
    );
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Saigon');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Place search is unavailable.')).toBeDefined();
  });

  test('keeps historical Mapbox default values readable and editable', async () => {
    const user = userEvent.setup();
    render(
      <form data-testid="location-form">
        <LocationPicker
          defaultLocation={{
            address: 'Old address',
            latitude: 10.1,
            longitude: 106.2,
            name: 'Old Mapbox Place',
            provider: 'mapbox',
            providerId: 'mapbox-old-id',
          }}
          placeholder="Search place"
          searchingLabel="Searching places"
        />
      </form>,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Old Mapbox Place');
    const form = screen.getByTestId('location-form') as HTMLFormElement;
    expect(getFormData(form).get('locationProvider')).toBe('mapbox');

    await user.clear(input);
    await user.type(input, 'Manual place');

    expect(getFormData(form).get('locationName')).toBe('Manual place');
    expect(getFormData(form).get('locationProvider')).toBe('');
    expect(getFormData(form).get('locationProviderId')).toBe('');
  });
});

describe('create location forms', () => {
  beforeEach(() => {
    mutationMocks.mutateAsync.mockReset();
    mutationMocks.mutateAsync.mockResolvedValue({
      message: 'trip.created',
      status: 'success',
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('does not reuse selected trip location metadata after a successful reset', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(createJsonResponse({ locations: nominatimLocations }));
    renderWithQueryClient(<CreateTripForm />);

    await user.type(screen.getByLabelText('Trip title'), 'First trip');
    await user.type(screen.getByLabelText('Location'), 'Hoi An');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: /Hoi An/ }));
    await user.click(screen.getByRole('button', { name: 'Create trip' }));

    await waitFor(() => expect(mutationMocks.mutateAsync).toHaveBeenCalledTimes(1));
    const firstPayload = mutationMocks.mutateAsync.mock.calls[0]?.[0] as FormData;
    expect(firstPayload.get('locationProvider')).toBe('nominatim');
    expect(firstPayload.get('locationProviderId')).toBe('relation:12345');

    await waitFor(() =>
      expect((screen.getByLabelText('Location') as HTMLInputElement).value).toBe(''),
    );
    await user.type(screen.getByLabelText('Trip title'), 'Second trip');
    await user.click(screen.getByRole('button', { name: 'Create trip' }));

    await waitFor(() => expect(mutationMocks.mutateAsync).toHaveBeenCalledTimes(2));
    const secondPayload = mutationMocks.mutateAsync.mock.calls[1]?.[0] as FormData;
    expect(secondPayload.get('locationName')).toBe('');
    expect(secondPayload.get('locationProvider')).toBe('');
    expect(secondPayload.get('locationProviderId')).toBe('');
    expect(secondPayload.get('locationLatitude')).toBe('');
    expect(secondPayload.get('locationLongitude')).toBe('');
  });

  test('does not reuse selected visited-place metadata after a successful reset', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(createJsonResponse({ locations: nominatimLocations }));
    mutationMocks.mutateAsync.mockResolvedValue({
      message: 'visitedPlace.created',
      status: 'success',
    });
    renderWithQueryClient(
      <CreateVisitedPlaceForm
        endDate="2026-05-05"
        startDate="2026-05-01"
        tripId="trip-one"
      />,
    );

    await user.type(screen.getByLabelText('Place title'), 'First stop');
    await user.type(screen.getByLabelText('Location'), 'Hoi An');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: /Hoi An/ }));
    await user.click(screen.getByRole('button', { name: 'Add stop' }));

    await waitFor(() => expect(mutationMocks.mutateAsync).toHaveBeenCalledTimes(1));
    const firstPayload = mutationMocks.mutateAsync.mock.calls[0]?.[0] as FormData;
    expect(firstPayload.get('locationProvider')).toBe('nominatim');
    expect(firstPayload.get('locationProviderId')).toBe('relation:12345');

    await waitFor(() =>
      expect((screen.getByLabelText('Location') as HTMLInputElement).value).toBe(''),
    );
    await user.type(screen.getByLabelText('Place title'), 'Second stop');
    await user.click(screen.getByRole('button', { name: 'Add stop' }));

    await waitFor(() => expect(mutationMocks.mutateAsync).toHaveBeenCalledTimes(2));
    const secondPayload = mutationMocks.mutateAsync.mock.calls[1]?.[0] as FormData;
    expect(secondPayload.get('locationProvider')).toBe('');
    expect(secondPayload.get('locationProviderId')).toBe('');
    expect(secondPayload.get('locationLatitude')).toBe('');
    expect(secondPayload.get('locationLongitude')).toBe('');
  });
});
