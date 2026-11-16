import {describe,expect,it} from 'vitest';
import {createStudioLighting,STUDIO_SUN_POSITION} from '../src/engine/studio-lighting';

describe('Hackeburg low afternoon sun',()=>{
  it('places the sun behind and left of the +Z-facing kiosk, at a low angle',()=>{
    const {ambient,sun}=createStudioLighting();
    expect(STUDIO_SUN_POSITION).toEqual([-8,5,-6]);
    expect(sun.position.x).toBeLessThan(0);
    expect(sun.position.z).toBeLessThan(0);
    expect(sun.position.y).toBeGreaterThan(0);
    const heightAboveTarget=sun.position.y-sun.target.position.y;
    const horizontalDistance=Math.hypot(sun.position.x-sun.target.position.x,sun.position.z-sun.target.position.z);
    expect(Math.atan2(heightAboveTarget,horizontalDistance)*180/Math.PI).toBeLessThan(30);
    expect(sun.castShadow).toBe(true);
    expect(sun.shadow.mapSize.x).toBe(2048);
    expect(ambient.intensity).toBeLessThan(1);
    sun.shadow.dispose();
  });
});
