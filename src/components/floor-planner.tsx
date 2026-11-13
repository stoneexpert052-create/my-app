
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, PlusCircle, Trash2, ChevronDown } from 'lucide-react';
import { useCalculation } from '@/context/calculation-context';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { edgeProfiles, ProfileType } from './order-form';
import { Card, CardContent } from './ui/card';

interface Room {
  id: number;
  length: string;
  width: string;
}

interface FloorPlannerProps {
  onSave: (data: { total: number; details: any; variant: MarbleVariant }) => void;
  initialState: any;
  marble: Marble;
  variant: MarbleVariant;
  onCancel: () => void;
}

export function FloorPlanner({
  onSave,
  initialState,
  marble,
  variant,
  onCancel,
}: FloorPlannerProps) {
  const { costs } = useCalculation();
  const [selectedVariant, setSelectedVariant] = useState(variant);
  const [rooms, setRooms] = useState<Room[]>(
    initialState?.rooms || [{ id: 1, length: '12', width: '10' }]
  );
  const [includeSkirting, setIncludeSkirting] = useState<boolean>(
    initialState?.includeSkirting || false
  );
  const [skirtingHeight, setSkirtingHeight] = useState<string>(
    initialState?.skirtingHeight || '4'
  );
  const [skirtingProfile, setSkirtingProfile] = useState<ProfileType>(
    initialState?.skirtingProfile || 'tukker'
  );

  useEffect(() => {
    if (initialState) {
      if (initialState.rooms && initialState.rooms.length > 0) {
        setRooms(initialState.rooms);
      }
      setIncludeSkirting(initialState.includeSkirting || false);
      setSkirtingHeight(String(initialState.skirtingHeight || '4'));
      setSkirtingProfile(initialState.skirtingProfile || 'tukker');
    } else {
      setRooms([{ id: 1, length: '12', width: '10' }]);
    }
  }, [initialState]);

  const addRoom = () => {
    setRooms([...rooms, { id: Date.now(), length: '12', width: '10' }]);
  };

  const removeRoom = (id: number) => {
    setRooms(rooms.filter((room) => room.id !== id));
  };

  const handleRoomChange = (
    id: number,
    field: 'length' | 'width',
    value: string
  ) => {
    const newRooms = rooms.map((room) =>
      room.id === id
        ? { ...room, [field]: value.replace(/[^0-9.]/g, '') }
        : room
    );
    setRooms(newRooms);
  };

  const calculations = useMemo(() => {
    const totalFloorArea = rooms.reduce((acc, room) => {
      const length = parseFloat(room.length) || 0;
      const width = parseFloat(room.width) || 0;
      return acc + length * width;
    }, 0);

    if (totalFloorArea <= 0) {
      return {
        totalFloorArea: 0,
        floorWastage: 0,
        finalFloorSqFt: 0,
        floorMaterialCost: 0,
        skirtingRft: 0,
        skirtingSqFt: 0,
        skirtingWastage: 0,
        finalSkirtingSqFt: 0,
        skirtingMaterialCost: 0,
        skirtingPolishCost: 0,
        grandTotal: 0,
        rooms: [],
        includeSkirting: false,
        wastagePercentage: 0,
        rate: 0,
      };
    }

    const variantPrice = selectedVariant.price ?? 0;
    const floorWastage = totalFloorArea * (costs.wastagePercentage / 100);
    const finalFloorSqFt = totalFloorArea + floorWastage;
    const floorMaterialCost = finalFloorSqFt * variantPrice;

    let skirtingRft = 0;
    let skirtingSqFt = 0;
    let skirtingWastage = 0;
    let finalSkirtingSqFt = 0;
    let skirtingMaterialCost = 0;
    let skirtingPolishCost = 0;
    const heightInFt = (parseFloat(skirtingHeight) || 0) / 12;
    const profilePrice = edgeProfiles[skirtingProfile]?.price || 0;

    if (includeSkirting) {
      skirtingRft = rooms.reduce((acc, room) => {
        const length = parseFloat(room.length) || 0;
        const width = parseFloat(room.width) || 0;
        return acc + 2 * (length + width); // Perimeter of the room
      }, 0);

      if (heightInFt > 0) {
        skirtingSqFt = skirtingRft * heightInFt;
        skirtingWastage = skirtingSqFt * (costs.wastagePercentage / 100);
        finalSkirtingSqFt = skirtingSqFt + skirtingWastage;
        skirtingMaterialCost = finalSkirtingSqFt * variantPrice;
      }
      
      skirtingPolishCost = skirtingRft * profilePrice;
    }

    const grandTotal = floorMaterialCost + skirtingMaterialCost + skirtingPolishCost;

    return {
      totalFloorArea,
      floorWastage,
      finalFloorSqFt,
      floorMaterialCost,
      skirtingRft,
      skirtingSqFt,
      skirtingWastage,
      finalSkirtingSqFt,
      skirtingMaterialCost,
      skirtingHeight: parseFloat(skirtingHeight) || 0,
      skirtingPolishCost,
      skirtingProfile,
      grandTotal,
      rooms,
      includeSkirting,
      rate: selectedVariant.price,
      wastagePercentage: costs.wastagePercentage,
    };
  }, [rooms, selectedVariant.price, includeSkirting, skirtingHeight, skirtingProfile, costs.wastagePercentage]);

  const handleSave = () => {
    onSave({ total: calculations.grandTotal, details: { ...calculations }, variant: selectedVariant });
  };
  
  const selectedProfileIcon = edgeProfiles[skirtingProfile]?.icon || edgeProfiles.none.icon;


  return (
    <div className="p-2 sm:p-6 space-y-6">
      <h3 className="font-bold text-xl uppercase tracking-wider text-center">
        Flooring Planner
      </h3>

      <Card>
        <CardContent className="p-6 space-y-6">
            {marble.variants.length > 1 && (
                <div>
                    <Label className="text-lg font-semibold">Material Format</Label>
                    <Select value={selectedVariant.id} onValueChange={(variantId) => {
                        const newVariant = marble.variants.find(v => v.id === variantId);
                        if (newVariant) setSelectedVariant(newVariant);
                    }}>
                        <SelectTrigger className="mt-2 text-base h-12">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {marble.variants.map(v => (
                                <SelectItem key={v.id} value={v.id}>
                                    {v.size} - {v.thickness} @ PKR {v.price?.toLocaleString()}/sq.ft
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div>
              <Label className="text-lg font-semibold">
                Enter Room Dimensions (in feet)
              </Label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mt-2">
                {rooms.map((room, index) => (
                  <div key={room.id} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-20">Room {index + 1}:</span>
                    <Input
                      value={room.length}
                      onChange={(e) => handleRoomChange(room.id, 'length', e.target.value)}
                      className="text-sm font-bold h-10"
                      placeholder="Length"
                      inputMode="decimal"
                    />
                    <span className="text-muted-foreground">x</span>
                    <Input
                      value={room.width}
                      onChange={(e) => handleRoomChange(room.id, 'width', e.target.value)}
                      className="text-sm font-bold h-10"
                      placeholder="Width"
                      inputMode="decimal"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeRoom(room.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addRoom}
                className="mt-4"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-skirting"
                    checked={includeSkirting}
                    onCheckedChange={(checked) => setIncludeSkirting(Boolean(checked))}
                  />
                  <Label htmlFor="include-skirting" className="text-lg font-semibold">
                    Include Skirting / Baseboard
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-10 px-3"
                          disabled={!includeSkirting}
                        >
                          {React.createElement(selectedProfileIcon)}
                          <span className="truncate text-sm mx-2">
                            {edgeProfiles[skirtingProfile]?.name || 'Select Profile'}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {Object.entries(edgeProfiles).map(([key, profile]) => (
                          <DropdownMenuItem
                            key={key}
                            onClick={() => setSkirtingProfile(key as ProfileType)}
                            className="flex justify-between"
                          >
                            <div className="flex items-center">
                              {profile.icon && <profile.icon />}
                              <span>{profile.name}</span>
                            </div>
                            {profile.price > 0 && (
                              <span className="text-xs text-muted-foreground ml-4">
                                PKR {profile.price}/rft
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Select
                      value={skirtingHeight}
                      onValueChange={setSkirtingHeight}
                      disabled={!includeSkirting}
                    >
                      <SelectTrigger className="w-[140px] text-base font-bold h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 inches</SelectItem>
                        <SelectItem value="4">4 inches</SelectItem>
                        <SelectItem value="5">5 inches</SelectItem>
                        <SelectItem value="6">6 inches</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Check this to automatically calculate skirting based on room perimeters. Material and polish charges will be added.
              </p>
            </div>
        </CardContent>
      </Card>
      
      {calculations.grandTotal > 0 && (
        <div className="mt-6 border-t pt-4">
          <Card>
            <CardContent className="p-4">
                <h4 className="font-bold text-center mb-2">Cost Breakdown for Flooring</h4>
                <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-4">
                        <Image
                          src={marble.imageUrl}
                          alt={marble.name}
                          width={64}
                          height={64}
                          className="rounded-md object-cover"
                        />
                        <div className='w-full'>
                            <p className="font-semibold text-base">{marble.name}</p>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Floor Area (incl. {costs.wastagePercentage}% wastage): {calculations.finalFloorSqFt.toFixed(2)} sq.ft @ PKR {(selectedVariant.price ?? 0).toLocaleString()}/sq.ft</span>
                                <span className="font-semibold">PKR {calculations.floorMaterialCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                    </div>
                     <Separator className="my-2" />
                     <div className="text-xs space-y-1">
                      {calculations.skirtingMaterialCost > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            Skirting Material ({calculations.finalSkirtingSqFt.toFixed(2)}{' '}
                            sq.ft):
                          </span>
                          <span className="font-semibold">
                            PKR{' '}
                            {calculations.skirtingMaterialCost.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 0 }
                            )}
                          </span>
                        </div>
                      )}
                      {calculations.skirtingPolishCost > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            {edgeProfiles[skirtingProfile]?.name || 'Skirting Polish'} (
                            {calculations.skirtingRft.toFixed(2)} rft):
                          </span>
                          <span className="font-semibold">
                            PKR{' '}
                            {calculations.skirtingPolishCost.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 0 }
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                     <Separator className="my-2" />
                    <div className="flex justify-between items-center text-lg font-bold pt-1">
                      <span>Total for this item:</span>
                      <span className="text-primary">
                        PKR{' '}
                        {calculations.grandTotal.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6 border-t pt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={calculations.grandTotal <= 0}>
          <Save className="mr-2 h-4 w-4" />
          Save Requirement
        </Button>
      </div>
    </div>
  );
}
