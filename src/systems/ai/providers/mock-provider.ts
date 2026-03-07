// ============================================================
// Schyrim — Mock LLM Provider
// Deterministic fallback for offline / no-API-key play.
// Returns varied prose from a curated template pool.
// ============================================================

import type { LLMProvider, ProviderConfig, StructuredPrompt, RawAIResponse } from '../../../core/types/ai.types.js';

// Pool of atmospheric descriptions keyed by `locationType_timePeriod`.
// Multiple entries per key are selected at random for variety.
const POOL: Record<string, string[]> = {
    city_morning: [
        'Whiterun stirs into morning life — guards exchange quiet words at the gate, a raven watches from a pine-top, and the smell of woodsmoke curls through the still air.',
        'The city wakes slowly. Frost clings to the cobblestones and a milk cart rattles past the stables, the driver hunched against the chill.',
        'Morning light breaks over the city walls in amber bands. Somewhere a bell rings, and doors begin to open across the market district.',
    ],
    city_afternoon: [
        'The afternoon sun sits high over Whiterun. Merchants call out their wares, children chase each other around the well, and a guard leans on his halberd watching the road.',
        'Dust hangs in shafts of pale gold above the marketplace. The city is alive with the ordinary noise of commerce — coins, argument, laughter.',
    ],
    city_evening: [
        'Long shadows creep across the cobblestones as the sun falls behind the Throat of the World. Lanterns are being lit and the smell of roasting meat drifts from the inn.',
        'Evening settles over the city like a heavy cloak. The market stalls fold down and the last merchants hurry home before dark.',
    ],
    city_night: [
        'The city sleeps uneasily. A lone guard paces the walls overhead, his torch a small orange star. Somewhere a dog barks twice, then goes quiet.',
        'Night over Whiterun is cold and clear. Stars crowd the sky above the Bannered Mare, whose windows glow amber against the dark.',
    ],

    inn_morning: [
        'The inn smells of stale mead and fresh bread. The barkeep wipes down the counter with a grey cloth, and a cat watches from a barrel in the corner.',
        'A few patrons nurse their morning drinks in silence. The fire from last night still has life in it, warming the low-ceilinged room.',
    ],
    inn_afternoon: [
        'The Bannered Mare is half-full — merchants talking trade, a bard tuning her lute in the corner, and the smell of something hearty simmering in the kitchen.',
        'Afternoon light filters through the small windows. The common room is easy and unhurried, a rare thing in these troubled times.',
    ],
    inn_evening: [
        'The inn fills with noise and warmth as evening descends. A bard plays something ancient and melancholy in the corner, and the mead flows freely.',
        'By evening the Bannered Mare is full. Voices rise and fall over the crackle of a proper fire, and someone is laughing too loudly at the bar.',
    ],
    inn_night: [
        'Most patrons have gone to bed or gone home. The bard has put away her lute and the fire is burning low. The barkeep leans on the counter, tired.',
        'The inn settles into a late-night quiet. Only a few candles still burn, and the occasional cough echoes from somewhere upstairs.',
    ],

    dungeon_morning: [
        'Deep beneath the earth, morning means nothing. The air is damp and cold, and ancient stone presses close on every side. Something drips in the darkness ahead.',
        'Torchlight catches the edges of carved walls — old Nordic runes, weathered by centuries of silence. The dungeon smells of stone and old death.',
    ],
    dungeon_afternoon: [
        'No natural light reaches this far down. The only sounds are your own breathing and the distant groan of settling stone. Danger hangs heavy here.',
        'The torch gutters in a draught from somewhere deeper in the ruin. Bones litter the floor — animal or human, it is hard to say.',
    ],
    dungeon_evening: [
        'The dark of a dungeon is a different dark from night above ground. It is total and still, broken only by your light, which seems to shrink with every step.',
        'Ancient pillars rise into shadow above. The air carries a faint scent of something burned a long time ago. You are not alone here — you can feel it.',
    ],
    dungeon_night: [
        'Whether it is night above or not changes nothing in these depths. The draugr stir at odd hours, and the silence between sounds feels heavier than stone.',
        'Cold permeates everything. The torch makes a small brave circle of light in the surrounding dark, and beyond it — movement, perhaps, or just imagination.',
    ],

    cave_morning: [
        'The cave mouth frames a sliver of pale morning sky, but inside it is always dark. Water drips from low stalactites and the floor is slick with damp.',
        'Stone walls glisten in the torchlight. The smell of earth and mildew is overwhelming, and somewhere within there is the sound of slow water.',
    ],
    cave_afternoon: [
        'Pale afternoon light barely reaches past the entrance. The cave interior is its own world — cold, wet, and indifferent to the sun above.',
        'The rock here is old and close. The ceiling dips suddenly in places, forcing you to mind your head. Somewhere ahead something moves in the dark.',
    ],
    cave_evening: [
        'The last daylight fades at the cave mouth behind you. Ahead is pure black, broken only by your torch. The sounds of the outside world grow muffled, then silent.',
        'The cave swallows sound. Your footsteps echo strangely and the drip of water plays tricks on the ear. Best to move carefully.',
    ],
    cave_night: [
        'Night and cave are one thing — absolute dark, broken only by what light you carry. The cold is more intense here, the silence more deliberate.',
        'Something watches from the dark. You can feel it even if you cannot see it. Your torch casts a circle of safety that feels thin and temporary.',
    ],

    wilderness_morning: [
        'Dawn light filters through the pines in long, pale shafts. The road ahead is empty, frost still white on the verge, and somewhere a hawk screams once.',
        'The morning wilderness is cold and beautiful. Mist sits in the valley below and the mountains are pink with first light. The road ahead looks empty — looks.',
    ],
    wilderness_afternoon: [
        'The road cuts through open country under a flat white sky. The wind is constant out here, carrying the smell of snow from the peaks. Nothing stirs on the horizon.',
        'Afternoon finds you exposed on the open road, mountains on one side, forest pressing close on the other. Good bandit country. You keep your eyes moving.',
    ],
    wilderness_evening: [
        'The light fails fast on the road at this hour. The shadows between the trees grow long and ambiguous. It would be wise to find shelter before true dark.',
        'Evening cools the road quickly. The last birds go silent and the pines take on a deeper, more threatening quality as the light drains out of the sky.',
    ],
    wilderness_night: [
        'The road at night is a different road. Stars crowd a black sky overhead, and every sound — a branch crack, a distant howl — carries weight it would not in daylight.',
        'Full dark on the road. You move by starlight and instinct, and the forest on either side is a wall of absolute black.',
    ],

    ruins_morning: [
        'Ancient Nordic stonework rises around you, weathered and half-swallowed by frost-heaved earth. The dawn light makes the ruins look almost peaceful — almost.',
        'Morning reveals the ruin in full: collapsed arches, cracked flagstones, the bones of a people who are long gone but not entirely departed.',
    ],
    ruins_afternoon: [
        'The ruin stands in afternoon light, every crack and carved surface sharp-edged and merciless. Whatever ceremony took place here ended badly, judging by what remains.',
        'Pale afternoon sky shows through a gap in the vaulted ceiling above. The chill in the air has nothing to do with temperature.',
    ],
    ruins_evening: [
        'The ruin takes on a different character as daylight goes. Shadows collect in corners, the carved faces on the walls seem to shift, and every echo has a companion.',
        'Something lives in these ruins — you can feel it in the way the air resists you. The draugr do not sleep soundly, even at day\'s end.',
    ],
    ruins_night: [
        'Night transforms the ruin entirely. The old stones seem to breathe. The carved dragon heads catch what little light there is and stare with flat, ancient patience.',
        'Full dark in the ruins. The wind finds every crack and crevice and makes sounds that could almost be words. The dead here are restless.',
    ],

    road_morning: [
        'The road stretches north through rocky scrubland, empty in the early morning. Frost glitters on the verge and your breath clouds in the cold air.',
        'A clear morning on the road. Distant peaks are already sharp against a pale blue sky, and the silence is total except for wind through the grass.',
    ],
    road_afternoon: [
        'The road runs straight under an overcast sky. Occasional wheel-ruts in the frozen mud are the only sign of recent traffic. The horizon is empty.',
        'A cold afternoon on the road, with nothing ahead but more road. The holds are vast, and the distance between settlements is not friendly.',
    ],
    road_evening: [
        'The light turns amber on the road and shadows stretch long. Smart travellers would be thinking about shelter by now.',
        'Evening on the road is a lonely thing. The sky above is full of colour and the world is briefly beautiful before the dark takes over.',
    ],
    road_night: [
        'Night closes in fast out here. Stars and starlight are all the illumination there is. The road is just a slightly darker shade of dark.',
        'The road at night belongs to the wolves and the desperate. Every sound carries far in the cold still air, and few of them are reassuring.',
    ],

    default: [
        'The area is quiet, for now. You take in your surroundings carefully, aware that the Reach rewards the observant and punishes the careless.',
        'You survey the location. It carries the weight of history — Skyrim always does. The wind moves through it like a slow breath.',
        'The world holds its breath around you. Somewhere distant, a raven calls. The path ahead is unclear, but staying still is rarely an option.',
    ],
};

function pickDescription(locationType: string, time: string): string {
    // Normalise time period: "8:00 AM (Morning)" → "morning"
    const timeLower = time.toLowerCase();
    let period = 'morning';
    if (timeLower.includes('afternoon')) period = 'afternoon';
    else if (timeLower.includes('evening') || timeLower.includes('dusk')) period = 'evening';
    else if (timeLower.includes('night') || timeLower.includes('midnight') || timeLower.includes('dawn')) period = 'night';

    const key = `${locationType}_${period}`;
    const pool = POOL[key] ?? POOL['default'] ?? ['You look around carefully.'];
    return pool[Math.floor(Math.random() * pool.length)]!;
}

export class MockProvider implements LLMProvider {
    readonly name = 'Schyrim Mock Narrator';
    readonly providerType = 'mock' as const;

    async initialize(_config: ProviderConfig): Promise<void> {}

    async generateResponse(prompt: StructuredPrompt): Promise<RawAIResponse> {
        const { location } = prompt.contextBlock;
        const text = pickDescription(location.type, location.time);
        return {
            text,
            provider: 'mock',
            model: 'mock-v1',
            latencyMs: 0,
        };
    }

    async isAvailable(): Promise<boolean> {
        return true;
    }
}
