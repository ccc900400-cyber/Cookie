import { AppSettings } from '../types';
import { useTranslation } from '../lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sun, Moon, Languages } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'motion/react';

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function SettingsPanel({ settings, setSettings }: SettingsPanelProps) {
  const t = useTranslation(settings.language);

  return (
    <ScrollArea className="h-full w-full">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 md:pt-8 pt-16 pb-24"
      >
        <motion.div variants={item} className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t.settings}</h1>
          <p className="text-muted-foreground">{t.settingsDesc}</p>
        </motion.div>

        <motion.div variants={container} className="grid gap-6">
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="w-5 h-5" />
                  {t.theme}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={settings.theme} 
                  onValueChange={(v) => setSettings({ ...settings, theme: v as any })}
                  className="grid grid-cols-2 gap-4"
                >
                <div className="flex flex-col gap-2">
                  <RadioGroupItem value="light" id="light" className="peer sr-only" />
                  <Label
                    htmlFor="light"
                    id="light-label"
                    className="flex flex-col items-center justify-center rounded-[9.6px] border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer min-h-[80px] text-[11px] leading-[14px] font-normal whitespace-nowrap"
                  >
                    <Sun className="mb-2 h-5 w-5" />
                    {t.light}
                  </Label>
                </div>
                <div className="flex flex-col gap-2">
                  <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                  <Label
                    htmlFor="dark"
                    id="dark-label"
                    className="flex flex-col items-center justify-center rounded-[9.6px] border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer min-h-[80px] text-[11px] leading-[14px] font-normal whitespace-nowrap"
                  >
                    <Moon className="mb-2 h-5 w-5" />
                    {t.dark}
                  </Label>
                </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  {t.language}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={settings.language} 
                  onValueChange={(v) => setSettings({ ...settings, language: v as any })}
                  className="grid grid-cols-3 gap-4"
                >
                <div className="flex flex-col gap-2">
                  <RadioGroupItem value="zh-CN" id="zh-CN" className="peer sr-only" />
                  <Label
                    htmlFor="zh-CN"
                    id="zh-CN-label"
                    className="flex flex-col items-center justify-center text-center rounded-[9.6px] border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer min-h-[60px] text-[10px] leading-tight font-normal"
                  >
                    {t.zhCN}
                  </Label>
                </div>
                <div className="flex flex-col gap-2">
                  <RadioGroupItem value="zh-TW" id="zh-TW" className="peer sr-only" />
                  <Label
                    htmlFor="zh-TW"
                    id="zh-TW-label"
                    className="flex flex-col items-center justify-center text-center rounded-[9.6px] border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer min-h-[60px] text-[10px] leading-tight font-normal"
                  >
                    {t.zhTW}
                  </Label>
                </div>
                <div className="flex flex-col gap-2">
                  <RadioGroupItem value="en" id="en" className="peer sr-only" />
                  <Label
                    htmlFor="en"
                    id="en-label"
                    className="flex flex-col items-center justify-center text-center rounded-[9.6px] border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer min-h-[60px] text-[12px] leading-tight font-normal"
                  >
                    {t.en}
                  </Label>
                </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </ScrollArea>
  );
}
