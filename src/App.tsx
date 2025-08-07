import React, { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import { 
  Container, 
  Typography, 
  Box, 
  TextField,
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Paper,
  Grid,
  Alert,
  TextareaAutosize,
  styled,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel, 
  Checkbox
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const StyledTextArea = styled(TextareaAutosize)({
  width: '100%',
  minHeight: '300px',
  padding: '15px',
  marginTop: '10px',
  fontFamily: '"Fira Code", "Courier New", monospace',
  fontSize: '14px',
  lineHeight: '1.5',
  borderRadius: '6px',
  border: '2px solid #e0e0e0',
  backgroundColor: '#f8f9fa',
  color: '#333',
  resize: 'vertical',
  '&:focus': {
    outline: 'none',
    borderColor: '#1976d2',
    boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)'
  },
  '&::placeholder': {
    color: '#999',
    fontStyle: 'italic'
  }
});

type Mode = 'backtesting' | 'trading';
type Contract = 'NQ' | 'ES' | 'MNQ';
type MaxMode = 'Reverse' | 'BreakThrough';

interface CsvCell {
  value: string | number;
  isNumeric: boolean;
}

interface CsvData {
  headers: string[];
  rows: CsvCell[][];
}

interface TradeData {
  [key: string]: any;
}

interface TradesData {
  Long: TradeData[];
  Short: TradeData[];
}

const accountNames = [
  'Account 1',
  'Account 2',
  'Account 3',
  'Demo Account'
];

const BotControlPanel: React.FC = () => {
  // Form state
  const [maxMode, setMaxMode] = useState<MaxMode>('Reverse');
  const [accountName, setAccountName] = useState('');
  const [mode, setMode] = useState<Mode>('backtesting');
  const [contract, setContract] = useState<Contract>('NQ');
  const [dateFrom, setDateFrom] = useState<Date | null>(new Date());
  const [dateTo, setDateTo] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [pointKey, setPointKey] = useState('15_7_5');
  const [exitStrategyKey, setExitStrategyKey] = useState('15_15');
  
  // UI state
  const [result, setResult] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
  const [mainTabValue, setMainTabValue] = useState(0);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [tradesData, setTradesData] = useState<TradesData | null>(null);
  
  // File upload state
  const [useFile, setUseFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultTabValue, setResultTabValue] = useState(0);
  const [tradesTabValue, setTradesTabValue] = useState(0);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    if (!accountName) {
      setSubmitStatus({
        success: false,
        message: 'Please select an account.'
      });
      return;
    }

    if (!useFile && (!dateFrom || !dateTo)) {
      setSubmitStatus({
        success: false,
        message: 'Please select date range or choose an input file.'
      });
      return;
    }

    if (useFile && !selectedFile) {
      setSubmitStatus({
        success: false,
        message: 'Please select an input file.'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const formData = new FormData();
      
      if (useFile && selectedFile) {
        formData.append('file', selectedFile);
      } else if (dateFrom && dateTo) {
        formData.append('dateFrom', dateFrom.toISOString());
        formData.append('dateTo', dateTo.toISOString());
      }

      // Add other form data
      formData.append('accountName', accountName);
      formData.append('mode', mode);
      formData.append('contract', contract);
      formData.append('maxMode', maxMode);
      formData.append('point_key', pointKey);
      formData.append('exit_strategy_key', exitStrategyKey);
      if (notes) formData.append('notes', notes);

      console.log('Bot uploading...');
      const response = await fetch('http://localhost:8090/api/v1/run-bot/max', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseJson = await response.json();

      console.log("Full response:", responseJson);
      
      const apiResult = responseJson.result;
      const jsonAPIResult = JSON.stringify(apiResult, null, 2);
      const trades = responseJson.trades;
      
      console.log("apiResult:", apiResult);       
      console.log("trades:", trades);

      // Process trades data
      if (trades && typeof trades === 'object') {
        setTradesData({
          Long: trades.Long || [],
          Short: trades.Short || []
        });
        console.log('Trades data set successfully:', trades);
      } else {
        setTradesData(null);
        console.log('No trades data available');
      }

      // Process result data for table
      if (apiResult && typeof apiResult === 'object') {
        const flattened: any[] = [];
      
        Object.entries(apiResult).forEach(([tp_sl, strategies]: [string, any]) => {
          Object.entries(strategies).forEach(([strategyType, data]: [string, any]) => {
            const { TP, SL, WINNING_TRADES, LOOSING_TRADES, NotTriggered, StrategyPoints } = data;
            const nested = data[0] || {};
      
            flattened.push({
              TP_SL: tp_sl,
              Type: strategyType,
              TP,
              SL,
              WINNING_TRADES,
              LOOSING_TRADES,
              NotTriggered,
              StrategyPoints,
              ...nested
            });
          });
        });
      
        if (flattened.length > 0) {
          const headers = Object.keys(flattened[0]);
          const rows = flattened.map(row =>
            headers.map(header => ({
              value: row[header] ?? '',
              isNumeric: typeof row[header] === 'number'
            }))
          );
      
          setCsvData({
            headers,
            rows
          });
          console.log('CSV data set successfully:', { headers, rowCount: rows.length });
        } else {
          setCsvData(null);
          console.log('No data to flatten');
        }
      } else {
        setCsvData(null);
        console.log('apiResult is not a valid object');
      }
      
      setResult(jsonAPIResult);

      setSubmitStatus({
        success: true,
        message: 'Bot executed successfully!'
      });
    } catch (error) {
      console.error('Error running bot:', error);
      setSubmitStatus({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // File upload handler
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    if (file) {
      setFileName(file.name);
    }
  };

  // Helper function to convert trades data to CSV format
  const downloadTradesAsCSV = (tradesArray: TradeData[], type: 'Long' | 'Short') => {
    if (!tradesArray || tradesArray.length === 0) return;

    const headers = Object.keys(tradesArray[0]);
    const csvContent = [
      headers.join(','),
      ...tradesArray.map(trade => 
        headers.map(header => {
          const value = String(trade[header] || '').replace(/"/g, '""');
          return /[,\n"]/.test(value) ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}-trades-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper function to copy trades data to clipboard
  const copyTradesToClipboard = (tradesArray: TradeData[]) => {
    if (!tradesArray || tradesArray.length === 0) return;

    const headers = Object.keys(tradesArray[0]);
    const tsvData = [
      headers.join('\t'),
      ...tradesArray.map(trade => 
        headers.map(header => trade[header] || '').join('\t')
      )
    ].join('\n');
    
    navigator.clipboard.writeText(tsvData);
  };

  const a11yProps = (index: number) => ({
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  });

  const TabPanel = (props: {
    children?: React.ReactNode;
    index: number;
    value: number;
  }) => {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
        style={{ width: '100%' }}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

  const handleMainTabChange = (event: React.SyntheticEvent, newTabValue: number) => {
    setMainTabValue(newTabValue);
  };
  
  const handleResultTabChange = (event: React.SyntheticEvent, newTabValue: number) => {
    setResultTabValue(newTabValue);
  };

  const handleTradesTabChange = (event: React.SyntheticEvent, newTabValue: number) => {
    setTradesTabValue(newTabValue);
  };

  // Render trades table
  const renderTradesTable = (tradesArray: TradeData[], type: 'Long' | 'Short') => {
    if (!tradesArray || tradesArray.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="textSecondary">
            No {type} trades available
          </Typography>
        </Box>
      );
    }

    const headers = Object.keys(tradesArray[0]);
    
    return (
      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" gutterBottom>
          {type} Trades ({tradesArray.length} trades)
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <TableContainer component={Paper}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {headers.map((header, index) => (
                    <TableCell key={index}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tradesArray.map((trade, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {headers.map((header, cellIndex) => (
                      <TableCell key={cellIndex}>
                        {trade[header]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              copyTradesToClipboard(tradesArray);
              setSubmitStatus({ success: true, message: `${type} trades copied to clipboard!` });
            }}
          >
            Copy {type} Trades
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              downloadTradesAsCSV(tradesArray, type);
              setSubmitStatus({ success: true, message: `${type} trades CSV download started!` });
            }}
          >
            Download {type} CSV
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Trading Bot Control Panel
          </Typography>
          
          <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={mainTabValue} 
                onChange={handleMainTabChange} 
                aria-label="trading and backtesting tabs" 
                variant="fullWidth"
                sx={{ marginBottom: 2 }}
              >
                <Tab label="Trading" {...a11yProps(0)} />
                <Tab label="Backtesting" {...a11yProps(1)} />
              </Tabs>
            </Box>
            
            {/* Trading Tab */}
            <TabPanel value={mainTabValue} index={0}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  Trading functionality coming soon...
                </Typography>
              </Box>
            </TabPanel>
            
            {/* Backtesting Tab */}
            <TabPanel value={mainTabValue} index={1}>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  {/* Account Name */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal" required>
                      <InputLabel id="account-name-label">Account Name</InputLabel>
                      <Select
                        labelId="account-name-label"
                        id="account-name"
                        value={accountName}
                        label="Account Name"
                        onChange={(e) => setAccountName(e.target.value as string)}
                      >
                        {accountNames.map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Contract */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal" required>
                      <InputLabel id="contract-label">Contract</InputLabel>
                      <Select
                        labelId="contract-label"
                        id="contract"
                        value={contract}
                        label="Contract"
                        onChange={(e) => setContract(e.target.value as Contract)}
                      >
                        <MenuItem value="NQ">NQ</MenuItem>
                        <MenuItem value="ES">ES</MenuItem>
                        <MenuItem value="MNQ">MNQ</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Max Mode */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal" required>
                      <InputLabel id="max-mode-label">Max Mode</InputLabel>
                      <Select
                        labelId="max-mode-label"
                        value={maxMode}
                        label="Max Mode"
                        onChange={(e) => setMaxMode(e.target.value as MaxMode)}
                      >
                        <MenuItem value="Reverse">Reverse</MenuItem>
                        <MenuItem value="BreakThrough">BreakThrough</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Point Key */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Point Key"
                      value={pointKey}
                      onChange={(e) => setPointKey(e.target.value as string)}
                      margin="normal"
                      required
                    />
                  </Grid>
                  
                  {/* Exit Strategy Key */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Exit Strategy Key"
                      value={exitStrategyKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExitStrategyKey(e.target.value as string)}
                      margin="normal"
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                        control={
                        <Checkbox
                            checked={useFile}
                            onChange={(e) => {
                            setUseFile(e.target.checked as boolean);
                            if (!e.target.checked as boolean) {
                                setSelectedFile(null);
                                setFileName('');
                            }
                            }}
                        />
                        }
                        label="Use input file"
                    />
                    {useFile && (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<CloudUploadIcon />}
                        >
                            Choose File
                            <input
                            type="file"
                            hidden
                            accept=".txt,.csv"
                            onChange={handleFileChange}
                            />
                        </Button>
                        <Typography variant="body2">
                            {fileName || "No file chosen"}
                        </Typography>
                        </Box>
                    )}
                  </Grid>

                  {/* Date Range - Side by Side */}
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <Grid item xs={12} md={6}>
                          <DatePicker
                          label="Date From"
                          value={dateFrom}
                          onChange={(newValue) => setDateFrom(newValue)}
                          disabled={useFile}
                          slotProps={{ 
                              textField: { 
                              fullWidth: true, 
                              margin: 'normal', 
                              required: !useFile 
                              } 
                          }}
                          />
                      </Grid>
                      <Grid item xs={12} md={6}>
                          <DatePicker
                          label="Date To"
                          value={dateTo}
                          onChange={(newValue) => setDateTo(newValue)}
                          disabled={useFile}
                          slotProps={{ 
                              textField: { 
                              fullWidth: true, 
                              margin: 'normal', 
                              required: !useFile 
                              } 
                          }}
                          />
                      </Grid>
                  </LocalizationProvider>
                  
                  {/* Notes */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notes (Optional)"
                      multiline
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value as string)}
                      margin="normal"
                    />
                  </Grid>
                  
                  {/* Submit Button */}
                  <Grid item xs={12}>
                    {submitStatus && (
                      <Alert severity={submitStatus.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                        {submitStatus.message}
                      </Alert>
                    )}
                    
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      disabled={isSubmitting}
                      startIcon={isSubmitting ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                    >
                      {isSubmitting ? 'Running...' : 'Run Bot'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </TabPanel>
          </Box>
        </Paper>
        
        {/* Results Section */}
        {result && (
          <Paper elevation={3} sx={{ mt: 4, p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={resultTabValue} 
                onChange={handleResultTabChange} 
                aria-label="result tabs"
              >
                <Tab label="JSON" />
                <Tab label="Result Table" disabled={!csvData} />
                <Tab label="Trades Table" disabled={!tradesData} />
              </Tabs>
            </Box>
            
            {/* JSON Tab */}
            <TabPanel value={resultTabValue} index={0}>
              <StyledTextArea
                value={result}
                readOnly
                placeholder="Bot execution results will appear here..."
              />
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    navigator.clipboard.writeText(result);
                    setSubmitStatus({ success: true, message: 'JSON copied to clipboard!' });
                  }}
                >
                  Copy JSON
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    const blob = new Blob([result], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'bot-results.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download JSON
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={() => {
                    setResult('');
                    setCsvData(null);
                    setTradesData(null);
                    setResultTabValue(0);
                  }}
                >
                  Clear Results
                </Button>
              </Box>
            </TabPanel>
            
            {/* Result Table Tab */}
            <TabPanel value={resultTabValue} index={1}>
              {csvData && (
                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                  <TableContainer component={Paper}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {csvData.headers.map((header, index) => (
                            <TableCell 
                              key={index}
                              align={csvData.rows[0]?.[index]?.isNumeric ? 'right' : 'left'}
                            >
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {csvData.rows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex: number) => (
                              <TableCell 
                                key={cellIndex}
                                align={cell.isNumeric ? 'right' : 'left'}
                              >
                                {cell.value}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => {
                        const tsvData = [
                          csvData.headers.join('\t'),
                          ...csvData.rows.map(row => 
                            row.map(cell => cell.value).join('\t')
                          )
                        ].join('\n');
                        navigator.clipboard.writeText(tsvData);
                        setSubmitStatus({ success: true, message: 'Table data copied to clipboard!' });
                      }}
                    >
                      Copy Table
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => {
                        const csvContent = [
                          csvData.headers.join(','),
                          ...csvData.rows.map(row => 
                            row.map(cell => {
                              const value = String(cell.value).replace(/"/g, '""');
                              return /[,\n"]/.test(value) ? `"${value}"` : value;
                            }).join(',')
                          )
                        ].join('\n');
                        
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.setAttribute('href', url);
                        link.setAttribute('download', `bot-results-${new Date().toISOString().slice(0, 10)}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        
                        setSubmitStatus({ success: true, message: 'CSV download started!' });
                      }}
                    >
                      Download CSV
                    </Button>
                  </Box>
                </Box>
              )}
            </TabPanel>

            {/* Trades Table Tab */}
            <TabPanel value={resultTabValue} index={2}>
              {tradesData && (
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs 
                      value={tradesTabValue} 
                      onChange={handleTradesTabChange} 
                      aria-label="trades tabs"
                    >
                      <Tab label={`Long (${tradesData.Long?.length || 0})`} />
                      <Tab label={`Short (${tradesData.Short?.length || 0})`} />
                    </Tabs>
                  </Box>
                  
                  {/* Long Trades Sub-Tab */}
                  <TabPanel value={tradesTabValue} index={0}>
                    {renderTradesTable(tradesData.Long, 'Long')}
                  </TabPanel>
                  
                  {/* Short Trades Sub-Tab */}
                  <TabPanel value={tradesTabValue} index={1}>
                    {renderTradesTable(tradesData.Short, 'Short')}
                  </TabPanel>
                </Box>
              )}
            </TabPanel>
          </Paper>
        )}
      </Container>
    );
  };

export default BotControlPanel;