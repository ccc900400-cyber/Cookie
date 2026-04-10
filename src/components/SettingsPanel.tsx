import { AppSettings } from '../types';
import { useTranslation } from '../lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sun, Moon, Eye, Languages } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

export default function SettingsPanel({ settings, setSettings }: SettingsPanelProps) {
  const t = useTranslation(settings.language);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 md:pt-8 pt-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t.settings}</h1>
        <p className="text-muted-foreground">{t.settingsDesc}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5" />
              {t.theme}
            </CardTitle>
            <CardDescription>{t.themeDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={settings.theme} 
              onValueChange={(v) => setSettings({ ...settings, theme: v as any })}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                <Label
                  htmlFor="light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Sun className="mb-3 h-6 w-6" />
                  {t.light}
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                <Label
                  htmlFor="dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Moon className="mb-3 h-6 w-6" />
                  {t.dark}
                </Label>
              </div>
              <div>
                <RadioGroupItem value="eye-protection" id="eye" className="peer sr-only" />
                <Label
                  htmlFor="eye"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Eye className="mb-3 h-6 w-6" />
                  {t.eye}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              {t.language}
            </CardTitle>
            <CardDescription>{t.languageDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={settings.language} 
              onValueChange={(v) => setSettings({ ...settings, language: v as any })}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem value="zh-CN" id="zh-CN" className="peer sr-only" />
                <Label
                  htmlFor="zh-CN"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  {t.zhCN}
                </Label>
              </div>
              <div>
                <RadioGroupItem value="zh-TW" id="zh-TW" className="peer sr-only" />
                <Label
                  htmlFor="zh-TW"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  {t.zhTW}
                </Label>
              </div>
              <div>
                <RadioGroupItem value="en" id="en" className="peer sr-only" />
                <Label
                  htmlFor="en"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  {t.en}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
