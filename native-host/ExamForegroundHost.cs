using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

internal static class ExamForegroundHost
{
    private static volatile bool running = true;
    private static readonly JavaScriptSerializer json = new JavaScriptSerializer();
    private static readonly Encoding utf8 = new UTF8Encoding(false);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

    private static int Main(string[] args)
    {
        if (args.Length == 0 || !args[0].StartsWith("chrome-extension://", StringComparison.Ordinal))
            return 2;

        Stream input = Console.OpenStandardInput();
        Stream output = Console.OpenStandardOutput();
        Thread reader = new Thread(() => ReadCommands(input));
        reader.IsBackground = true;
        reader.Start();

        Send(output, new { kind = "READY", timestamp = Timestamp() });
        string previous = null;
        while (running)
        {
            string category = ForegroundCategory();
            if (category != previous)
            {
                previous = category;
                Send(output, new { kind = "FOREGROUND_CHANGED", appCategory = category, timestamp = Timestamp() });
            }
            Thread.Sleep(250);
        }
        return 0;
    }

    private static string Timestamp()
    {
        return DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture);
    }

    private static string ForegroundCategory()
    {
        uint processId;
        IntPtr window = GetForegroundWindow();
        if (window == IntPtr.Zero || GetWindowThreadProcessId(window, out processId) == 0 || processId == 0)
            return "OTHER";
        try
        {
            using (Process process = Process.GetProcessById((int)processId))
                return ClassifyProcessName(process.ProcessName);
        }
        catch
        {
            return "OTHER";
        }
    }

    public static string ClassifyProcessName(string processName)
    {
        switch ((processName ?? "").ToUpperInvariant())
        {
            case "WINWORD": return "WORD";
            case "NOTEPAD": return "NOTEPAD";
            case "ACRORD32":
            case "ACROBAT":
            case "FOXITPDFREADER":
            case "FOXITPDFEDITOR":
            case "SUMATRAPDF": return "PDF_READER";
            default: return "OTHER";
        }
    }

    private static void ReadCommands(Stream input)
    {
        try
        {
            while (running)
            {
                string frame = ReadFrame(input);
                if (frame == null) break;
                Dictionary<string, object> command = json.Deserialize<Dictionary<string, object>>(frame);
                if (command != null && command.ContainsKey("kind") && (string)command["kind"] == "STOP")
                    break;
            }
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error.GetType().Name);
        }
        running = false;
    }

    private static string ReadFrame(Stream input)
    {
        byte[] header = ReadExactly(input, 4);
        if (header == null) return null;
        if (!BitConverter.IsLittleEndian) Array.Reverse(header);
        int length = BitConverter.ToInt32(header, 0);
        if (length < 0 || length > 1024 * 1024) throw new InvalidDataException("Invalid frame length.");
        byte[] body = ReadExactly(input, length);
        return body == null ? null : utf8.GetString(body);
    }

    private static byte[] ReadExactly(Stream input, int length)
    {
        byte[] buffer = new byte[length];
        int total = 0;
        while (total < length)
        {
            int count = input.Read(buffer, total, length - total);
            if (count == 0) return null;
            total += count;
        }
        return buffer;
    }

    private static void Send(Stream output, object value)
    {
        byte[] body = utf8.GetBytes(json.Serialize(value));
        byte[] header = BitConverter.GetBytes(body.Length);
        if (!BitConverter.IsLittleEndian) Array.Reverse(header);
        output.Write(header, 0, header.Length);
        output.Write(body, 0, body.Length);
        output.Flush();
    }
}
